import { CanActivate, Injectable, Logger, UnauthorizedException, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TokenService } from './token.service';
import { 
  Credential, 
  SignInPayload, 
  SignupPayload, 
  Token,
  RefreshTokenPayload 
} from "../data";
import { 
  CredentialDeleteException, 
  SignupException, 
  UserAlreadyExistException, 
  UserNotFoundException 
} from "../security.exception";
import { User } from '@model/User/entities/user.entity';
import { UserRole } from '@model/User/entities/user-role.enum';

import { Builder } from 'builder-pattern';
import { isNil } from 'lodash';
import { catchError } from 'rxjs';
import {ulid} from 'ulid';
import { comparePassword, encryptPassword } from '../utils';
import { ApiException } from '@common/config/api/model/api.exception';
import { ApiCodeResponse } from '@common/config';
import { MailService } from '@common/services/mail.service';
import { v4 as uuidv4 } from 'uuid';

console.log('=== FICHIER SECURITY.SERVICE.TS CHARGÉ ===');

// Exception personnalisée pour mot de passe erroné
class InvalidPasswordException extends ApiException {
  constructor() {
    super(ApiCodeResponse.PAYLOAD_IS_NOT_VALID, 401); // Ou crée un code dédié si tu veux
  }
}

@Injectable()

export class SecurityService {

 private readonly logger = new Logger(SecurityService.name);
  constructor(
      @InjectRepository(Credential) private readonly repository: Repository<Credential>,
      @InjectRepository(User) private readonly userRepository: Repository<User>,
      private readonly tokenService: TokenService,
      private readonly mailService: MailService
  ){}

  private loginAttempts = new Map<string, { count: number, lastAttempt: Date }>();
  private readonly MAX_ATTEMPTS = 5;
  private readonly LOCK_TIME = 15 * 60 * 1000; // 15 minutes

  private checkLoginAttempts(username: string): boolean {
    const attempts = this.loginAttempts.get(username);
    if (attempts && attempts.count >= this.MAX_ATTEMPTS) {
      const timePassed = Date.now() - attempts.lastAttempt.getTime();
      if (timePassed < this.LOCK_TIME) {
        throw new Error('Account temporarily locked. Try again later.');
      }
      this.loginAttempts.delete(username);
    }
    return true;
  }

  // Part detail
  async detail(id: string): Promise<Credential> {
    const result: Credential = await this.repository.findOne({ where: { credential_id: id } });

    if (!isNil(result)) {
      return result;
    }
    throw new UserNotFoundException();
  }

//Part signIn

  /**
   * Authentifie un utilisateur
   * @param payload Les informations de connexion (email, password)
   * @param isAdmin Indique si on vérifie un compte admin
   * @returns Token d'authentification ou null
   */
  async signIn(payload: SignInPayload, isAdmin: boolean): Promise<Token | null> {
    try {
      this.logger.log(`🔐 Tentative de connexion avec: ${payload.username}`);
      
      let credential;
      
      // Si c'est une connexion sociale (Google/Facebook)
      if (payload.socialLogin && (payload.googleHash || payload.facebookHash)) {
        this.logger.log(`🔐 Tentative de connexion sociale avec: ${payload.username}`);
        
        // Chercher par email et googleHash/facebookHash
        credential = await this.repository
          .createQueryBuilder('credential')
          .where('credential.mail = :email', { email: payload.username })
          .andWhere('(credential.googleHash = :googleHash OR credential.facebookHash = :facebookHash)', {
            googleHash: payload.googleHash || '',
            facebookHash: payload.facebookHash || ''
          })
          .getOne();
          
        if (!credential) {
          this.logger.warn(`❌ Utilisateur social non trouvé: ${payload.username}`);
          throw new UserNotFoundException();
        }
      } else {
        // Connexion classique par email/username
        credential = await this.repository
          .createQueryBuilder('credential')
          .where('credential.mail = :identifier OR credential.username = :identifier', {
            identifier: payload.username
          })
          .getOne();

        if (!credential) {
          throw new UserNotFoundException();
        }
      }

      // Récupérer et mettre à jour l'utilisateur si nécessaire
      const user = await this.userRepository.findOne({
        where: { email: credential.mail }
      });

      // Vérification de l'activation du compte utilisateur
      if (!user || !user.isActive) {
        throw new UnauthorizedException({
          statusCode: 401,
          code: 'USER_INACTIVE',
          message: 'Votre compte est inactif. Veuillez contacter un administrateur pour le réactiver.'
        });
      }

      // Si l'utilisateur est VISITOR, le promouvoir en MEMBER (mais ne jamais écraser ADMIN ou ORGANIZER)
      if (user && user.type_user === UserRole.VISITOR) {
        user.type_user = UserRole.MEMBER;
        await this.userRepository.save(user);
        this.logger.log(`✅ Utilisateur promu automatiquement en MEMBER: ${user.email}`);
      }
      // Ne rien faire si l'utilisateur est déjà MEMBER, ORGANIZER ou ADMIN

      // Vérifier si l'utilisateur est admin
      if (isAdmin && !credential.isAdmin) {
        throw new UnauthorizedException('Admin access required');
      }

      await this.validateAndGenerateTokens(credential, payload);
      
      this.logger.log(`✅ Connexion réussie pour: ${credential.username}`);
      return this.tokenService.getTokens(credential);
    } catch (error) {
      this.logger.error(`❌ Échec de connexion: ${error.message}`);
      throw error;
    }
  }

  //part signUp
  /**
   * Inscription d'un nouvel utilisateur
   * Flux :
   * 1. Vérifie si email/username existe déjà
   * 2. Crée les credentials (table credentials)
   * 3. Crée l'utilisateur (table users)
   * 4. Génère les tokens JWT
   */
  async signup(payload: SignupPayload, isAdmin: boolean = false): Promise<Token> {
    try {
      // Vérifier si l'email existe déjà
      const existingEmail = await this.repository.findOneBy({ mail: payload.mail });
      if (existingEmail) {
        this.logger.warn(`❌ Email déjà utilisé: ${payload.mail}`);
        throw new UserAlreadyExistException();
      }

      // Vérifier si le username existe déjà
      const existingUsername = await this.repository.findOneBy({ username: payload.username });
      if (existingUsername) {
        this.logger.warn(`❌ Nom d'utilisateur déjà pris: ${payload.username}`);
        throw new UserAlreadyExistException();
      }

      // 1. Créer le Credential
      const hashedPassword = await encryptPassword(payload.password);
      const newCredential = await this.repository.save({
        credential_id: ulid(),
        username: payload.username,
        password: hashedPassword,
        mail: payload.mail,
        isAdmin: isAdmin,
        googleHash: '',
        facebookHash: '',
        active: true
      });

      // 2. Créer l'utilisateur avec le rôle MEMBER par défaut (sauf si admin)
      const newUser = this.userRepository.create({
        email: payload.mail,
        password: hashedPassword,
        nom: payload.nom,
        prenom: payload.prenom,
        entreprise: payload.entreprise,
        type_user: isAdmin ? UserRole.ADMIN : UserRole.MEMBER,
        // Ajout automatique de la photo par défaut si aucune photo n'est fournie
        photo: 'default.jpg', // <-- photo par défaut
      });

      try {
        const savedUser = await this.userRepository.save(newUser);
        this.logger.log(`✅ User créé dans la table users: ${newUser.email} avec le rôle: ${savedUser.type_user}`);
      } catch (error) {
        await this.repository.remove(newCredential);
        throw error;
      }

      this.logger.log(`✅ Utilisateur créé: ${newCredential.username}`);
      return this.tokenService.getTokens(newCredential);
    } catch (error) {
      this.logger.error(`❌ Erreur création utilisateur: ${error.message}`);
      throw error;
    }
  }

  //part refresh
  async refresh(payload: RefreshTokenPayload): Promise<Token | null> {
    return this.tokenService.refresh(payload);
  }

  //part Delete

  async delete(id: string): Promise<void> {
    try {
      const detail = await this.detail(id);
      
      // 1. Supprimer les tokens JWT
      await this.tokenService.deleteFor(detail);
      
      // 2. Marquer le credential comme inactif
      detail.active = false;
      await this.repository.save(detail);
      
      // 3. Marquer l'utilisateur comme inactif
      const user = await this.userRepository.findOne({
        where: { email: detail.mail }
      });
      if (user) {
        user.isActive = false;
        await this.userRepository.save(user);
      }
    } catch (e) {
      throw new CredentialDeleteException();
    }
  }

  /**
   * Recherche un utilisateur par login social
   */
  private async findBySocialLogin(payload: SignInPayload, isAdmin: boolean): Promise<Credential> {
    if (payload.googleHash) {
      const user = await this.repository.findOneBy({
        googleHash: payload.googleHash,
        isAdmin: isAdmin
      });
      if (!user) throw new UserNotFoundException();
      return user;
    }
    throw new UserNotFoundException();
  }

  /**
   * Recherche un utilisateur par ses identifiants classiques
   */
  private async findByCredentials(payload: SignInPayload, isAdmin: boolean): Promise<Credential> {
    // Recherche l'utilisateur d'abord
    const user = await this.repository
      .createQueryBuilder('credential')
      .where('(credential.mail = :identifier OR credential.username = :identifier)', {
        identifier: payload.username
      })
      .getOne();

    if (!user) {
      this.logger.warn(`❌ Utilisateur non trouvé avec l'identifiant: ${payload.username}`);
      throw new UserNotFoundException();
    }

    // Vérifie ensuite si l'utilisateur a les bons droits
    if (isAdmin && !user.isAdmin) {
      this.logger.warn(`❌ L'utilisateur ${user.username} n'est pas un administrateur`);
      throw new UserNotFoundException();
    }

    this.logger.debug(`👤 Utilisateur trouvé: ${user.username} (${user.mail})`);
    return user;
  }

  /**
   * Vérifie si un utilisateur existe (debug)
   */
  private async debugUserSearch(username: string): Promise<void> {
    const allUsers = await this.repository.find();
    this.logger.debug('🔍 Utilisateurs en base:');
    allUsers.forEach(user => {
      this.logger.debug(`- ${user.username} (${user.mail}) [${user.isAdmin ? 'admin' : 'membre'}]`);
    });
  }

  /**
   * Vérifie le mot de passe et génère les tokens
   */
  private async validateAndGenerateTokens(user: Credential, payload: SignInPayload): Promise<void> {
    if (!user.password || !(payload.socialLogin || await comparePassword(payload.password, user.password))) {
      this.logger.warn(`🚫 Mot de passe erroné pour: ${user.username}`);
      throw new InvalidPasswordException();
    }
    this.logger.debug(`✅ Validation OK pour: ${user.username}`);
  }

  /**
   * Vérifie si un utilisateur existe déjà
   */
  private async userExists(username: string): Promise<boolean> {
    const user = await this.repository.findOneBy({ username });
    return !!user;
  }

  /**
   * Crée un nouvel utilisateur
   */
  private async createUser(payload: SignupPayload, isAdmin: boolean): Promise<Credential> {
    const encryptedPassword = (!payload.googleHash && !payload.facebookHash) 
      ? await encryptPassword(payload.password) 
      : '';

    return await this.repository.save(Builder<Credential>()
      .credential_id(ulid())
      .username(payload.username)
      .password(encryptedPassword)
      .googleHash(payload.googleHash || '')
      .facebookHash(payload.facebookHash || '')
      .mail(payload.mail)
      .isAdmin(isAdmin)
      .build());
  }

  /**
   * Promotion d'un utilisateur au rôle ORGANIZER
   * - Vérifie l'existence de l'utilisateur
   * - Met à jour son type_user
   */
  async promoteToOrganizer(userId: string): Promise<void> {
    const user = await this.userRepository.findOne({ 
      where: { id: userId } 
    });
    
    if (!user) {
      throw new UserNotFoundException();
    }

    user.type_user = UserRole.ORGANIZER;
    await this.userRepository.save(user);
    this.logger.log(`✅ Utilisateur promu en ORGANIZER: ${user.email}`);
  }

  /**
   * Corrige le rôle d'un utilisateur admin si nécessaire
   */
  async fixAdminRole(userId: string): Promise<void> {
    const user = await this.userRepository.findOne({ 
      where: { id: userId }
    });

    if (user) {
      const credential = await this.repository.findOne({
        where: { mail: user.email }
      });

      if (credential?.isAdmin && user.type_user !== UserRole.ADMIN) {
        user.type_user = UserRole.ADMIN;
        await this.userRepository.save(user);
        this.logger.log(`✅ Rôle admin corrigé pour: ${user.email}`);
      }
    }
  }

  // Ajoutons une méthode pour vérifier le rôle actuel
  async checkUserRole(userId: string): Promise<void> {
    const user = await this.userRepository.findOne({ 
      where: { id: userId },
      select: ['id', 'email', 'type_user'] 
    });
    
    if (user) {
      this.logger.log(`👤 Utilisateur ${user.email} a le rôle: ${user.type_user}`);
    }
  }

  async promoteToMember(userId: string): Promise<void> {
    const user = await this.userRepository.findOne({ 
      where: { id: userId } 
    });
    
    if (!user) {
      throw new UserNotFoundException();
    }

    user.type_user = UserRole.MEMBER;
    await this.userRepository.save(user);
    this.logger.log(`✅ Utilisateur promu en MEMBER: ${user.email}`);
  }

  /**
   * Promotion d'un utilisateur au rôle ADMIN
   * - Vérifie l'existence de l'utilisateur
   * - Met à jour son type_user et marque isAdmin à true dans les credentials
   */
  async promoteToAdmin(userId: string): Promise<void> {
    // 1. Trouver l'utilisateur
    const user = await this.userRepository.findOne({ 
      where: { id: userId } 
    });
    
    if (!user) {
      throw new UserNotFoundException();
    }

    // 2. Mettre à jour le rôle utilisateur
    user.type_user = UserRole.ADMIN;
    await this.userRepository.save(user);
    
    // 3. Mettre à jour les credentials pour marquer isAdmin à true
    const credential = await this.repository.findOne({
      where: { mail: user.email }
    });
    
    if (credential) {
      credential.isAdmin = true;
      await this.repository.save(credential);
    }
    
    this.logger.log(`✅ Utilisateur promu en ADMIN: ${user.email}`);
  }

  async remove(id: string): Promise<void> {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) throw new NotFoundException(`User with ID ${id} not found`);
    user.isActive = false; // Soft delete
    await this.userRepository.save(user);

    // Désactiver aussi le credential associé
    const credential = await this.repository.findOne({ where: { mail: user.email } });
    if (credential) {
      credential.active = false;
      await this.repository.save(credential);
    }
  }

  /**
   * Restaure un utilisateur désactivé (soft delete)
   * @param id - L'identifiant de l'utilisateur à restaurer
   */
  async restore(id: string): Promise<void> {
    this.logger.log(`Tentative de restauration pour ID: ${id}`);
    const user = await this.userRepository.findOne({ where: { id } });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    if (user.isActive) {
      throw new Error('Utilisateur déjà actif');
    }

    // Réactiver l'utilisateur
    user.isActive = true;
    await this.userRepository.save(user);
    this.logger.log(`Utilisateur réactivé: ${user.email}`);

    // Réactiver aussi le credential associé
    const credential = await this.repository.findOne({ where: { mail: user.email } });
    if (credential) {
      credential.active = true;
      await this.repository.save(credential);
      this.logger.log(`Credential réactivé pour: ${user.email}`);
    }

    try {
      // Envoi d'un email de notification de restauration
      await this.mailService.sendMail(
        user.email,
        'Compte restauré',
        'Votre compte a été restauré par un administrateur. Vous pouvez maintenant vous reconnecter.'
      );
      this.logger.log(`Mail de restauration envoyé à: ${user.email}`);
    } catch (error) {
      this.logger.error(`Erreur lors de l'envoi de l'email de restauration: ${error.message}`);
    }
  }

  /**
   * Recherche un utilisateur par son email
   * @param email Email de l'utilisateur
   * @returns L'utilisateur trouvé ou null
   */
  async findByEmail(email: string) {
    return this.userRepository.findOne({ where: { email } });
  }

  /**
   * Crée un nouvel utilisateur à partir des données Google
   * @param data Données de l'utilisateur Google
   * @returns L'utilisateur créé
   */
  async createFromGoogle(data: { email: string; displayName: string; googleId: string }) {
    // On sépare le displayName en nom et prénom
    const [prenom, ...nomParts] = data.displayName.split(' ');
    const nom = nomParts.join(' ');

    const user = this.userRepository.create({
      email: data.email,
      nom,
      prenom,
      password: '', // Pas de mot de passe pour les utilisateurs Google
      type_user: UserRole.MEMBER,
      isActive: true,
      // On stocke l'ID Google dans un champ personnalisé si nécessaire
      // googleId: data.googleId, // À ajouter si tu veux stocker l'ID Google
    });

    return this.userRepository.save(user);
  }

  /**
   * Génère un token JWT pour un utilisateur Google
   * @param userData Données de l'utilisateur Google
   * @returns Token JWT
   */
  async generateToken(userData: any) {
    try {
      // Vérifier si l'utilisateur existe déjà
      let user = await this.findByEmail(userData.email);
      
      if (!user) {
        // Créer un nouvel utilisateur si nécessaire
        user = await this.createFromGoogle(userData);
      } else if (!user.isActive) {
        // Si l'utilisateur existe mais est désactivé, on refuse la connexion avec une exception explicite
        throw new ForbiddenException('Utilisateur désactivé. Veuillez contacter un administrateur.');
      }

      // Créer ou mettre à jour les credentials
      let credential = await this.repository.findOne({ where: { mail: user.email } });
      
      if (!credential) {
        credential = await this.repository.save({
          credential_id: ulid(),
          username: user.email,
          mail: user.email,
          googleHash: userData.googleId,
          isAdmin: false,
          active: true
        });
      }

      // Générer le token JWT
      return this.tokenService.getTokens(credential);
    } catch (error) {
      this.logger.error(`Erreur lors de la génération du token Google: ${error.message}`);
      throw error;
    }
  }

  /**
   * Demande de réinitialisation du mot de passe
   * - Génère un token unique
   * - Stocke le token et sa date d'expiration
   * - Envoie un email avec le lien de réinitialisation
   */
  async requestPasswordReset(email: string): Promise<void> {
    const credential = await this.repository.findOne({ where: { mail: email } });
    if (!credential) throw new NotFoundException('Email non trouvé');

    // Générer un token unique et une date d'expiration (1h)
    const token = uuidv4();
    credential.resetToken = token;
    credential.resetTokenExpires = new Date(Date.now() + 3600 * 1000); // 1h
    await this.repository.save(credential);

    // Générer le lien de réinitialisation (corrigé pour Angular : /auth/reset-password/)
    const resetLink = `http://localhost:4200/auth/reset-password/${token}`;
    // Log explicite pour vérifier le lien généré (doit apparaître dans la console du backend)
    console.log('Lien de reset envoyé :', resetLink);
    await this.mailService.sendMail(
      email,
      'Réinitialisation du mot de passe',
      `Cliquez sur ce lien pour réinitialiser votre mot de passe : ${resetLink}`,
      `<p>Cliquez sur ce lien pour réinitialiser votre mot de passe : <a href="${resetLink}">${resetLink}</a></p>`
    );
    this.logger.log(`Lien de réinitialisation envoyé à ${email}`);
  }

  /**
   * Réinitialisation du mot de passe via le token
   * - Vérifie le token et sa validité
   * - Met à jour le mot de passe
   * - Supprime le token de la base[Nest] 12356  - 21/06/2025 22:47:14    WARN [SecurityService] 🚫 Mot de passe erroné pour: JURYTEST2
[Nest] 12356  - 21/06/2025 22:47:14   ERROR [SecurityService] ❌ Échec 
de connexion: Invalid Password Exception
[Nest] 12356  - 21/06/2025 22:47:14   ERROR [ApiInterceptor] InvalidPasswordException: Invalid Password Exception
[Nest] 12356  - 21/06/2025 22:48:35     LOG [MailService] Tentative d'envoi d'email à jurytest2@hotmail.be
[Nest] 12356  - 21/06/2025 22:48:36     LOG [MailService] ✅ Email envo
yé avec succès à jurytest2@hotmail.be (MessageId: <7e17ec04-b2b3-a590-f56f-989528cae5bc@monapp.com>)
[Nest] 12356  - 21/06/2025 22:48:36     LOG [MailService] 🔗 Aperçu Ethereal: https://ethereal.email/message/aFcZzhUEKDDG0sY2aFcapNmj0lJfmPkPAAAAApMIlph8lQVp.KVdshC1OxA
[Nest] 12356  - 21/06/2025 22:48:36     LOG [SecurityService] Lien de 
réinitialisation envoyé à jurytest2@hotmail.be
[Nest] 12356  - 21/06/2025 22:48:36     LOG [ApiInterceptor] path /api/security/forgot-password

   */
  async resetPassword(token: string, newPassword: string): Promise<void> {
    const credential = await this.repository.findOne({ where: { resetToken: token } });
    if (!credential || !credential.resetTokenExpires || credential.resetTokenExpires < new Date()) {
      throw new BadRequestException('Token invalide ou expiré');
    }
    credential.password = await encryptPassword(newPassword);
    credential.resetToken = null;
    credential.resetTokenExpires = null;
    await this.repository.save(credential);
    this.logger.log(`Mot de passe réinitialisé pour ${credential.mail}`);
  }
}
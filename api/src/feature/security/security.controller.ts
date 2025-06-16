import { Body, Controller, Delete, Get, Param, Post, Patch, UseGuards, Req, Res } from "@nestjs/common";
import { ApiBearerAuth, ApiTags, ApiOperation, ApiResponse } from "@nestjs/swagger";
import { SecurityService } from "./service";
import { Credential } from './data/entity/credential.entity';
import { Token } from './data/entity/token.entity';
import { SignInPayload, SignupPayload } from './data/payload';
import { RefreshTokenPayload } from './data/payload/refresh-token.payload';
import { Public, User } from "@common/config";
import { RolesGuard } from './guards/roles.guard';
import { Roles } from './decorators/roles.decorator';
import { UserRole } from '@model/User/entities/user-role.enum';
import { JwtGuard } from './guards/jwt.guard';
import { AuthGuard } from '@nestjs/passport';

@ApiBearerAuth('access-token')
@ApiTags('Security')
@Controller('security')
export class SecurityController {
  constructor(private readonly service: SecurityService) {}

  /**
   * Connexion utilisateur standard
   * - Vérifie les credentials
   * - Génère un token JWT
   * - Ne nécessite pas d'authentification (@Public)
   */
  @Public()
  @Post('signin')
  @ApiOperation({ summary: 'Connexion utilisateur' })
  @ApiResponse({ status: 200, description: 'Connexion réussie' })
  @ApiResponse({ status: 401, description: 'Identifiants invalides ou compte inactif' })
  public signIn(@Body() payload: SignInPayload): Promise<Token> {
    return this.service.signIn(payload, false);
  }

  /**
   * Connexion administrateur
   * - Vérifie les credentials + statut admin
   * - Génère un token JWT avec droits admin
   */
  @Public()
  @Post('admin-signin')
  @ApiOperation({ summary: 'Connexion administrateur' })
  @ApiResponse({ status: 200, description: 'Connexion admin réussie' })
  @ApiResponse({ status: 401, description: 'Identifiants invalides ou compte inactif' })
  public adminSignIn(@Body() payload: SignInPayload): Promise<Token> {
    return this.service.signIn(payload, true);
  }

  /**
   * Inscription utilisateur standard
   * - Crée un nouveau compte utilisateur
   * - Génère les credentials et le token
   */
  @Public()
  @Post('signup')
  public signUp(@Body() payload: SignupPayload): Promise<Token> {
    return this.service.signup(payload, false);
  }

  /**
   * Inscription administrateur
   * - Crée un nouveau compte admin
   * - Génère les credentials et le token avec droits admin
   */
  @Public()
  @Post('admin-signup')
  public adminSignUp(@Body() payload: SignupPayload): Promise<Token> {
    return this.service.signup(payload, true);
  }

  @Public()
  @Post('refresh')
  public refresh(@Body() payload: RefreshTokenPayload): Promise<Token> {
    return this.service.refresh(payload);
  }

  @Public()
  @Post('google/signin')
  public googleSignIn(@Body() payload: SignInPayload): Promise<Token> {
    const googlePayload = {
      ...payload,
      socialLogin: true,
      googleHash: payload.googleHash,
      facebookHash: ''
    };
    return this.service.signIn(googlePayload, false);
  }

  @Public()
  @Post('google/admin-signin')
  public googleAdminSignIn(@Body() payload: SignInPayload): Promise<Token> {
    const googlePayload = {
      ...payload,
      socialLogin: true,
      googleHash: payload.googleHash,
      facebookHash: ''
    };
    return this.service.signIn(googlePayload, true);
  }

  @Public()
  @Post('google/signup')
  public googleSignUp(@Body() payload: SignupPayload): Promise<Token> {
    const googlePayload = {
      ...payload,
      googleHash: payload.googleHash,
      facebookHash: ''
    };
    return this.service.signup(googlePayload, false);
  }

  @Public()
  @Post('google/admin-signup')
  public googleAdminSignUp(@Body() payload: SignupPayload): Promise<Token> {
    const googlePayload = {
      ...payload,
      googleHash: payload.googleHash,
      facebookHash: ''
    };
    return this.service.signup(googlePayload, true);
  }

  @Get('me')
  public me(@User() user: Credential): Credential {
    return user;
  }

  @Delete('delete/:id')
  public delete(@Param('id') credential_id: string): Promise<void> {
    return this.service.delete(credential_id);
  }

  /**
   * Promotion d'un utilisateur au rôle ORGANIZER
   * - Nécessite d'être admin (RolesGuard + @Roles)
   * - Change le type_user en ORGANIZER
   */
  @Patch('promote/:id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Promouvoir un utilisateur' })
  async promoteUser(
    @Param('id') userId: string,
    @Body() body: { role: UserRole }
  ): Promise<void> {
    if (body.role === UserRole.MEMBER) {
      return this.service.promoteToMember(userId);
    } else if (body.role === UserRole.ORGANIZER) {
      return this.service.promoteToOrganizer(userId);
    }
    throw new Error('Invalid role');
  }

  @Patch('fix-role/:id')
  @Public() // Temporairement public pour la correction
  @ApiOperation({ summary: 'Corriger le rôle d\'un utilisateur admin' })
  async fixAdminRole(@Param('id') userId: string): Promise<void> {
    return this.service.fixAdminRole(userId);
  }

  @Get('check-role/:id')
  @Public()
  @ApiOperation({ summary: 'Vérifier le rôle d\'un utilisateur' })
  async checkRole(@Param('id') userId: string): Promise<void> {
    return this.service.checkUserRole(userId);
  }

  // Nouvel endpoint pour promouvoir un utilisateur en ADMIN
  @Post('promote-to-admin/:userId')
  @Roles(UserRole.ADMIN)
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Promouvoir un utilisateur en administrateur' })
  @ApiResponse({ status: 200, description: 'L\'utilisateur a été promu avec succès' })
  async promoteToAdmin(@Param('userId') userId: string): Promise<{ success: boolean, message: string }> {
    await this.service.promoteToAdmin(userId);
    return { 
      success: true, 
      message: 'L\'utilisateur a été promu administrateur avec succès' 
    };
  }

  // Endpoint pour vérifier le rôle de l'utilisateur
  @Get('check-role/:userId')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Vérifier le rôle d\'un utilisateur' })
  async checkUserRole(@Param('userId') userId: string): Promise<void> {
    await this.service.checkUserRole(userId);
  }

  /**
   * Restaure un utilisateur désactivé (soft delete)
   * - Nécessite d'être admin
   */
  @Patch('restore/:id')
  @UseGuards(JwtGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Restaurer un utilisateur désactivé' })
  async restoreUser(@Param('id') id: string) {
    console.log('--- [RESTORE] Endpoint appelé avec id:', id);
    await this.service.restore(id);
    console.log('--- [RESTORE] Service terminé pour id:', id);
    return { code: 'api.common.success', result: true };
  }

  /**
   * Démarre l'authentification Google OAuth
   * Redirige l'utilisateur vers Google
   */
  @Get('google')
  @UseGuards(AuthGuard('google'))
  @Public()
  async googleAuth() {
    // Passport gère la redirection
  }

  /**
   * Callback Google OAuth
   * Récupère l'utilisateur Google, génère un JWT, puis redirige vers le front avec le token
   */
  @Get('google/redirect')
  @UseGuards(AuthGuard('google'))
  @Public()
  async googleAuthRedirect(@Req() req, @Res() res) {
    try {
      // Générer le token JWT
      const token = await this.service.generateToken(req.user);
      
      // Rediriger vers le frontend avec le token
      // Note: Le token est stocké dans la propriété 'token' de l'entité Token
      res.redirect(`https://samy801172.github.io/Stage_TFE_2025_Lemkadem_Abdeljalil/auth/google/callback?token=${token.token}`);
    } catch (error) {
      // En cas d'erreur, rediriger vers la page de login avec un message d'erreur
      res.redirect('https://samy801172.github.io/Stage_TFE_2025_Lemkadem_Abdeljalil/auth/login?error=auth_failed');
    }
  }

  /**
   * Demande de réinitialisation du mot de passe
   * - Reçoit l'email, déclenche l'envoi du lien de reset
   */
  @Public()
  @Post('forgot-password')
  async forgotPassword(@Body() body: { email: string }) {
    await this.service.requestPasswordReset(body.email);
    return { message: 'Email de réinitialisation envoyé' };
  }

  /**
   * Réinitialisation du mot de passe via le token
   * - Reçoit le token et le nouveau mot de passe
   */
  @Public()
  @Post('reset-password')
  async resetPassword(@Body() body: { token: string, newPassword: string }) {
    await this.service.resetPassword(body.token, body.newPassword);
    return { message: 'Mot de passe réinitialisé' };
  }
}

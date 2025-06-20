import { Controller, Get, Post, Body, Put, Param, Delete, UseGuards, NotFoundException, Patch, Req, UseInterceptors, UploadedFile, BadRequestException } from '@nestjs/common';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { JwtAuthGuard } from '@feature/security/guards/jwt-auth.guard';
import { RolesGuard } from '@feature/security/guards/roles.guard';
import { Roles } from '@feature/security/decorators/roles.decorator';
import { UserRole } from './entities/user-role.enum';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { User } from './entities/user.entity';
import { JwtGuard } from '@feature/security/guards/jwt.guard';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import * as path from 'path';

// IMPORTANT :
// Ce contrôleur n'a PAS de décorateur @Roles ou @UseGuards(RolesGuard) sur la classe.
// La restriction de rôle est appliquée uniquement sur la méthode findAll pour permettre l'accès à tous les membres et admins.
// Cela garantit que la messagerie privée fonctionne pour tous les utilisateurs connectés.

@ApiTags('Users')
@ApiBearerAuth()
@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post()
  async create(@Body() createUserDto: CreateUserDto) {
    return await this.userService.create(createUserDto);
  }

  // Route accessible à tous les utilisateurs connectés (MEMBER et ADMIN) pour la messagerie privée.
  // Nécessaire si le RolesGuard est appliqué globalement.
  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.MEMBER, UserRole.ADMIN)
  async findAll(@Req() req) {
    // DEBUG: Affichage du rôle utilisateur reçu dans findAll (à activer uniquement en développement)
    // console.log('Rôle utilisateur reçu dans findAll:', req.user?.role);
    return await this.userService.findAll();
  }

  // Route dédiée pour la messagerie privée : retourne la liste des membres actifs (sauf soi-même).
  // Accessible à tous les membres connectés, sans restriction de rôle.
  @Get('contacts')
  @UseGuards(JwtAuthGuard)
  async getContacts(@Req() req) {
    return this.userService.findContacts(req.user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  async getProfile(@Req() req) {
    return this.userService.findOne(req.user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Put('profile')
  async updateProfile(@Req() req, @Body() updateUserDto: UpdateUserDto) {
    await this.userService.put(req.user.userId, updateUserDto);
    return { code: 'api.common.success', result: true };
  }

  // Nouvelle route pour récupérer tous les membres (actifs + inactifs) pour l'admin
  // IMPORTANT : Cette route doit être déclarée AVANT la route dynamique ':id' !
  // Sinon, /users/all sera interprété comme un id et provoquera une erreur de type uuid.
  @Get('all')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async findAllUsersAdmin() {
    // Retourne tous les utilisateurs sans filtrer sur isActive
    return await this.userService.findAllAdmin();
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async findOne(@Param('id') id: string) {
    return await this.userService.findOne(id);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  async update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    // Update the user information
    await this.userService.put(id, updateUserDto);

    // A confirmation email will be sent to the user after the update
    return { code: 'api.common.success', result: true };
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async remove(@Param('id') id: string) {
    // DEBUG: Appel de la route DELETE /users/:id (à activer uniquement en développement)
    // console.log('[UserController] Appel de la route DELETE /users/' + id);
    try {
      await this.userService.remove(id);
      return { code: 'api.common.success', result: true };
    } catch (error) {
      if (error.message === 'Utilisateur déjà désactivé') {
        return { code: 'api.user.already_deactivated', message: 'Utilisateur déjà désactivé', result: false };
      }
      throw error;
    }
  }

  @Patch(':id/restore')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async restore(@Param('id') id: string) {
    try {
      await this.userService.restore(id);
      return { code: 'api.common.success', result: true };
    } catch (error) {
      if (error.message === 'Utilisateur déjà actif') {
        return { code: 'api.user.already_active', message: 'Utilisateur déjà actif', result: false };
      }
      throw error;
    }
  }

  /**
   * Permet à un utilisateur d'envoyer une demande de contact à un autre membre.
   * Body attendu : { contactId: string, message?: string }
   */
  @Post('contacts')
  @UseGuards(JwtAuthGuard)
  async addContact(@Req() req, @Body() body) {
    const { contactId, message } = body;
    return this.userService.addContact(req.user.userId, contactId, message);
  }

  @UseGuards(JwtAuthGuard)
  @Post('profile/photo')
  // Limite la taille de la photo de profil à 2 Mo maximum (empêche l'erreur 413 si l'image est trop grosse)
  // IMPORTANT : le champ du fichier dans le FormData doit être 'photo' et le dossier d'upload est 'members' (sans accent)
  @UseInterceptors(FileInterceptor('photo', {
    storage: diskStorage({
      destination: './public/members', // <-- Uniformisé : dossier sans accent
      filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        cb(null, req.user.userId + '-' + Date.now() + ext);
      }
    }),
    limits: { fileSize: 2 * 1024 * 1024 } // 2 Mo
  }))
  async uploadPhoto(@UploadedFile() file: any, @Req() req) {
    if (!file) {
      throw new BadRequestException('Aucun fichier reçu');
    }
    await this.userService.put(req.user.userId, { photo: file.filename });
    return { photo: file.filename };
  }
}

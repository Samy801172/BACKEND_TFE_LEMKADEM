import { Injectable, NotFoundException, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';
import { Multer } from 'multer';

interface MulterFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  buffer: Buffer;
  size: number;
}

const unlinkAsync = promisify(fs.unlink);
const existsAsync = promisify(fs.exists);
const mkdirAsync = promisify(fs.mkdir);

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>
  ) {}

  /**
   * Met à jour la photo de profil d'un utilisateur
   * - Sauvegarde la nouvelle photo
   * - Supprime l'ancienne
   * - Met à jour la DB
   */
  async updateProfilePhoto(userId: string, file: MulterFile): Promise<string> {
    try {
      // 1. Vérifier que l'utilisateur existe
      const user = await this.userRepository.findOne({ where: { id: userId } });
      if (!user) {
        throw new NotFoundException('Utilisateur non trouvé');
      }

      // 2. Préparer le dossier de destination
      const uploadDir = path.join(process.cwd(), 'public', 'membres');
      if (!await existsAsync(uploadDir)) {
        await mkdirAsync(uploadDir, { recursive: true });
      }

      // 3. Générer un nom de fichier unique
      const timestamp = Date.now();
      const extension = path.extname(file.originalname);
      const filename = `${userId}-${timestamp}${extension}`;
      const filePath = path.join(uploadDir, filename);

      // 4. Sauvegarder l'ancienne photo pour la supprimer plus tard
      const oldPhoto = user.photo;

      // 5. Écrire le nouveau fichier
      await fs.promises.writeFile(filePath, file.buffer);

      // 6. Mettre à jour la DB
      user.photo = filename;
      await this.userRepository.save(user);

      // 7. Supprimer l'ancienne photo si elle existe et n'est pas la photo par défaut
      if (oldPhoto && oldPhoto !== 'default.jpg') {
        const oldPath = path.join(uploadDir, oldPhoto);
        try {
          if (await existsAsync(oldPath)) {
            await unlinkAsync(oldPath);
          }
        } catch (e) {
          console.warn(`Impossible de supprimer l'ancienne photo: ${oldPhoto}`, e);
          // On ne fait pas échouer l'opération si la suppression échoue
        }
      }

      return filename;
    } catch (error) {
      // Si une erreur survient pendant le processus, on s'assure de nettoyer
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException(
        `Erreur lors de la mise à jour de la photo: ${error.message}`
      );
    }
  }

  /**
   * Supprime la photo de profil d'un utilisateur
   * - Remet la photo par défaut
   * - Supprime l'ancienne photo
   */
  async deleteProfilePhoto(userId: string): Promise<void> {
    try {
      const user = await this.userRepository.findOne({ where: { id: userId } });
      if (!user) {
        throw new NotFoundException('Utilisateur non trouvé');
      }

      const oldPhoto = user.photo;
      if (oldPhoto && oldPhoto !== 'default.jpg') {
        const filePath = path.join(process.cwd(), 'public', 'membres', oldPhoto);
        try {
          if (await existsAsync(filePath)) {
            await unlinkAsync(filePath);
          }
        } catch (e) {
          console.warn(`Impossible de supprimer la photo: ${oldPhoto}`, e);
        }
      }

      user.photo = 'default.jpg';
      await this.userRepository.save(user);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException(
        `Erreur lors de la suppression de la photo: ${error.message}`
      );
    }
  }
} 
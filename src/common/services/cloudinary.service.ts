import { Injectable } from '@nestjs/common';
import { v2 as cloudinary } from 'cloudinary';

@Injectable()
export class CloudinaryService {
  constructor() {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });
  }

  /**
   * Upload une image vers Cloudinary
   * @param file - Fichier à uploader
   * @param folder - Dossier de destination (optionnel)
   * @returns Promise avec l'URL de l'image
   */
  async uploadImage(file: Express.Multer.File, folder: string = 'kiwi-club'): Promise<string> {
    try {
      console.log('📤 CloudinaryService: Upload en cours...');
      
      // Convertir le buffer en base64
      const base64String = file.buffer.toString('base64');
      const dataUri = `data:${file.mimetype};base64,${base64String}`;
      
      const result = await cloudinary.uploader.upload(dataUri, {
        folder: folder,
        public_id: `profile_${Date.now()}`,
        resource_type: 'auto',
        transformation: [
          { width: 500, height: 500, crop: 'fill', gravity: 'face' },
          { quality: 'auto' }
        ]
      });

      console.log('✅ CloudinaryService: Upload réussi:', result.secure_url);
      return result.secure_url;
    } catch (error) {
      console.error('❌ CloudinaryService: Erreur upload:', error);
      throw new Error('Erreur lors de l\'upload vers Cloudinary');
    }
  }

  /**
   * Supprime une image de Cloudinary
   * @param publicId - ID public de l'image
   * @returns Promise avec le résultat de la suppression
   */
  async deleteImage(publicId: string): Promise<void> {
    try {
      await cloudinary.uploader.destroy(publicId);
      console.log('✅ CloudinaryService: Image supprimée:', publicId);
    } catch (error) {
      console.error('❌ CloudinaryService: Erreur suppression:', error);
      throw new Error('Erreur lors de la suppression de l\'image');
    }
  }

  /**
   * Extrait le public_id d'une URL Cloudinary
   * @param url - URL Cloudinary
   * @returns Public ID
   */
  extractPublicId(url: string): string {
    const parts = url.split('/');
    const filename = parts[parts.length - 1];
    return filename.split('.')[0];
  }
}

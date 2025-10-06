import { Injectable } from '@nestjs/common';
import { v2 as cloudinary } from 'cloudinary';

@Injectable()
export class CloudinaryService {
  constructor() {
    // Vérifier si Cloudinary est configuré
    if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
      console.warn('⚠️ Cloudinary non configuré - Variables d\'environnement manquantes');
      return;
    }
    
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });
    
    console.log('✅ CloudinaryService configuré avec succès');
  }

  /**
   * Upload une image vers Cloudinary
   * @param file - Fichier à uploader
   * @param folder - Dossier de destination (optionnel)
   * @returns Promise avec l'URL de l'image
   */
  async uploadImage(file: any, folder: string = 'kiwi-club'): Promise<string> {
    try {
      // Vérifier si Cloudinary est configuré
      if (!process.env.CLOUDINARY_CLOUD_NAME) {
        console.warn('⚠️ Cloudinary non configuré - Fallback vers stockage local');
        throw new Error('Cloudinary non configuré');
      }
      
      console.log('📤 CloudinaryService: Upload en cours...');
      
      // Utiliser le chemin du fichier pour l'upload
      const uploadOptions = {
        folder: folder,
        public_id: `profile_${Date.now()}`,
        resource_type: 'auto' as const,
        transformation: [
          { width: 500, height: 500, crop: 'fill', gravity: 'face' },
          { quality: 'auto' }
        ]
      };

      console.log('📤 CloudinaryService: Upload depuis:', file.path);
      
      const result = await cloudinary.uploader.upload(file.path, uploadOptions);

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

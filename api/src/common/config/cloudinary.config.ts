import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: 'Tdkvsl0nrh', // Remplace par ton cloud_name Cloudinary
  api_key: '463768642256664',        // Remplace par ta clé API Cloudinary
  api_secret: 'cin15HBZ0bOF90QDEv4vS1xZ7dg'      // Remplace par ton secret Cloudinary
});

export default cloudinary; 
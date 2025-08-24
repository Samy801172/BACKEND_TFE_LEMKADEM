-- Script pour supprimer la colonne is_validated de la table events
-- Exécutez ce script dans votre base de données MySQL

-- Vérifier si la colonne existe avant de la supprimer
SET @column_exists = (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = 'kiwi_club'
  AND TABLE_NAME = 'events'
  AND COLUMN_NAME = 'is_validated'
);

-- Supprimer la colonne si elle existe
SET @sql = IF(@column_exists > 0, 
  'ALTER TABLE events DROP COLUMN is_validated',
  'SELECT "La colonne is_validated n\'existe pas" as message'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Afficher la structure de la table après modification
DESCRIBE events; 
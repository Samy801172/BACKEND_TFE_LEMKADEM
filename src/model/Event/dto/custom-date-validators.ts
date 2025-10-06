import { ValidatorConstraint, ValidatorConstraintInterface, ValidationArguments } from 'class-validator';

@ValidatorConstraint({ name: 'isFutureDate', async: false })
export class IsFutureDateConstraint implements ValidatorConstraintInterface {
  validate(date: Date, args: ValidationArguments) {
    // Vérifier que la date est définie et valide
    if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
      return false;
    }
    
    return date > new Date();
  }
  defaultMessage(args: ValidationArguments) {
    return 'La date doit être dans le futur';
  }
}

@ValidatorConstraint({ name: 'isNotTooFarInFuture', async: false })
export class IsNotTooFarInFutureConstraint implements ValidatorConstraintInterface {
  validate(date: Date, args: ValidationArguments) {
    // Vérifier que la date est définie et valide
    if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
      return false;
    }
    
    const now = new Date();
    const twoYearsFromNow = new Date(now.getFullYear() + 2, now.getMonth(), now.getDate());
    return date <= twoYearsFromNow;
  }
  defaultMessage(args: ValidationArguments) {
    return 'La date ne peut pas être plus de 2 ans dans le futur';
  }
}

@ValidatorConstraint({ name: 'isBusinessHours', async: false })
export class IsBusinessHoursConstraint implements ValidatorConstraintInterface {
  validate(date: Date, args: ValidationArguments) {
    // Vérifier que la date est définie et valide
    if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
      return false;
    }
    
    // Permettre les événements 24h/24 (suppression de la contrainte d'heures)
    return true;
  }
  defaultMessage(args: ValidationArguments) {
    return 'La date de l\'événement doit être valide';
  }
} 
const { body, validationResult } = require('express-validator');

// Middleware to handle validation errors
const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            message: 'Validation failed',
            errors: errors.array()
        });
    }
    next();
};

// User registration validation
const validateRegistration = [
    body('email')
        .isEmail()
        .normalizeEmail()
        .withMessage('Please provide a valid email address'),
    body('password')
        .isLength({ min: 6 })
        .withMessage('Password must be at least 6 characters long')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
        .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),
    body('role')
        .isIn(['patient', 'doctor'])
        .withMessage('Role must be either patient or doctor'),
    body('firstName')
        .trim()
        .isLength({ min: 2, max: 100 })
        .withMessage('First name must be between 2 and 100 characters'),
    body('lastName')
        .trim()
        .isLength({ min: 2, max: 100 })
        .withMessage('Last name must be between 2 and 100 characters'),
    body('phone')
        .optional()
        .isMobilePhone()
        .withMessage('Please provide a valid phone number'),
    handleValidationErrors
];

// User login validation
const validateLogin = [
    body('email')
        .isEmail()
        .normalizeEmail()
        .withMessage('Please provide a valid email address'),
    body('password')
        .notEmpty()
        .withMessage('Password is required'),
    body('role')
        .isIn(['patient', 'doctor'])
        .withMessage('Role must be either patient or doctor'),
    handleValidationErrors
];

// Appointment validation
const validateAppointment = [
    body('doctorId')
        .isInt({ min: 1 })
        .withMessage('Valid doctor ID is required'),
    body('appointmentDate')
        .isISO8601()
        .toDate()
        .withMessage('Valid appointment date is required'),
    body('appointmentTime')
        .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
        .withMessage('Valid appointment time is required (HH:MM format)'),
    body('type')
        .isIn(['consultation', 'follow-up', 'emergency', 'routine'])
        .withMessage('Valid appointment type is required'),
    body('reason')
        .trim()
        .isLength({ min: 10, max: 500 })
        .withMessage('Reason must be between 10 and 500 characters'),
    handleValidationErrors
];

// Health record validation
const validateHealthRecord = [
    body('recordType')
        .isIn(['blood_sugar', 'blood_pressure', 'weight', 'temperature', 'heart_rate', 'lab_result', 'medication', 'other'])
        .withMessage('Valid record type is required'),
    body('value')
        .trim()
        .notEmpty()
        .withMessage('Value is required'),
    body('unit')
        .optional()
        .trim()
        .isLength({ max: 20 })
        .withMessage('Unit must be less than 20 characters'),
    body('recordedAt')
        .optional()
        .isISO8601()
        .toDate()
        .withMessage('Valid recorded date is required'),
    body('notes')
        .optional()
        .trim()
        .isLength({ max: 1000 })
        .withMessage('Notes must be less than 1000 characters'),
    handleValidationErrors
];

// Message validation
const validateMessage = [
    body('recipientId')
        .isInt({ min: 1 })
        .withMessage('Valid recipient ID is required'),
    body('subject')
        .trim()
        .isLength({ min: 3, max: 255 })
        .withMessage('Subject must be between 3 and 255 characters'),
    body('message')
        .trim()
        .isLength({ min: 10, max: 2000 })
        .withMessage('Message must be between 10 and 2000 characters'),
    body('isUrgent')
        .optional()
        .isBoolean()
        .withMessage('isUrgent must be a boolean value'),
    handleValidationErrors
];

// Care plan validation
const validateCarePlan = [
    body('patientId')
        .isInt({ min: 1 })
        .withMessage('Valid patient ID is required'),
    body('title')
        .trim()
        .isLength({ min: 5, max: 255 })
        .withMessage('Title must be between 5 and 255 characters'),
    body('description')
        .optional()
        .trim()
        .isLength({ max: 2000 })
        .withMessage('Description must be less than 2000 characters'),
    body('startDate')
        .isISO8601()
        .toDate()
        .withMessage('Valid start date is required'),
    body('endDate')
        .optional()
        .isISO8601()
        .toDate()
        .withMessage('Valid end date is required'),
    body('goals')
        .optional()
        .trim()
        .isLength({ max: 2000 })
        .withMessage('Goals must be less than 2000 characters'),
    handleValidationErrors
];

// Medication validation
const validateMedication = [
    body('patientId')
        .isInt({ min: 1 })
        .withMessage('Valid patient ID is required'),
    body('medicationName')
        .trim()
        .isLength({ min: 2, max: 255 })
        .withMessage('Medication name must be between 2 and 255 characters'),
    body('dosage')
        .trim()
        .isLength({ min: 1, max: 100 })
        .withMessage('Dosage must be between 1 and 100 characters'),
    body('frequency')
        .trim()
        .isLength({ min: 1, max: 100 })
        .withMessage('Frequency must be between 1 and 100 characters'),
    body('startDate')
        .isISO8601()
        .toDate()
        .withMessage('Valid start date is required'),
    body('endDate')
        .optional()
        .isISO8601()
        .toDate()
        .withMessage('Valid end date is required'),
    body('instructions')
        .optional()
        .trim()
        .isLength({ max: 1000 })
        .withMessage('Instructions must be less than 1000 characters'),
    handleValidationErrors
];

// Password reset validation
const validatePasswordReset = [
    body('email')
        .isEmail()
        .normalizeEmail()
        .withMessage('Please provide a valid email address'),
    handleValidationErrors
];

// Password change validation
const validatePasswordChange = [
    body('currentPassword')
        .notEmpty()
        .withMessage('Current password is required'),
    body('newPassword')
        .isLength({ min: 6 })
        .withMessage('New password must be at least 6 characters long')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
        .withMessage('New password must contain at least one uppercase letter, one lowercase letter, and one number'),
    body('confirmPassword')
        .custom((value, { req }) => {
            if (value !== req.body.newPassword) {
                throw new Error('Password confirmation does not match');
            }
            return true;
        }),
    handleValidationErrors
];

// Profile update validation
const validateProfileUpdate = [
    body('firstName')
        .optional()
        .trim()
        .isLength({ min: 2, max: 100 })
        .withMessage('First name must be between 2 and 100 characters'),
    body('lastName')
        .optional()
        .trim()
        .isLength({ min: 2, max: 100 })
        .withMessage('Last name must be between 2 and 100 characters'),
    body('phone')
        .optional()
        .isMobilePhone()
        .withMessage('Please provide a valid phone number'),
    body('address')
        .optional()
        .trim()
        .isLength({ max: 500 })
        .withMessage('Address must be less than 500 characters'),
    handleValidationErrors
];

module.exports = {
    handleValidationErrors,
    validateRegistration,
    validateLogin,
    validateAppointment,
    validateHealthRecord,
    validateMessage,
    validateCarePlan,
    validateMedication,
    validatePasswordReset,
    validatePasswordChange,
    validateProfileUpdate
};
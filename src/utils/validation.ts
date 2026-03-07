import * as v from 'valibot';
import { ALLOWED_APPS } from '../config/apps';

export const QuerySchema = v.object({
	app_id: v.optional(v.picklist(ALLOWED_APPS), 'sso'),
	redirect: v.optional(v.string(), '/'),
});

const EmailSchema = v.pipe(
	v.string('Email is required.'),
	v.minLength(1, 'Email is required.'),
	v.email('Please enter a valid email address.'),
);

const PasswordSchema = v.pipe(v.string('Password is required.'), v.minLength(8, 'Password must be at least 8 characters long.'));

export const LoginSchema = v.object({
	email: EmailSchema,
	password: PasswordSchema,
});

export const RegisterSchema = v.pipe(
	v.object({
		email: EmailSchema,
		password: PasswordSchema,
		confirmPassword: v.string('Please confirm your password.'),
	}),
	v.check((input) => input.password === input.confirmPassword, 'Passwords do not match.'),
);

export const ForgotPasswordSchema = v.object({
	email: EmailSchema,
});

export const ResetPasswordSchema = v.pipe(
	v.object({
		token: v.string(),
		password: PasswordSchema,
		confirmPassword: v.string(),
	}),
	v.check((input) => input.password === input.confirmPassword, 'Passwords do not match.'),
);

export const MagicLinkSchema = v.object({
	email: EmailSchema,
});

export const ChangePasswordSchema = v.pipe(
	v.object({
		currentPassword: v.string('Current password is required.'),
		newPassword: PasswordSchema,
		confirmNewPassword: v.string('Please confirm your new password.'),
	}),
	v.check((input) => input.newPassword === input.confirmNewPassword, 'New passwords do not match.'),
);

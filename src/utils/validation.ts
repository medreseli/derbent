import * as v from 'valibot';

export const QuerySchema = v.object({
	app_id: v.optional(v.string(), 'sso'),
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

// Admin User Schemas
export const AdminUpdateUserSchema = v.object({
	metadata: v.optional(v.record(v.string(), v.any())),
	email_verified: v.optional(v.union([v.literal(0), v.literal(1)])),
	app: v.optional(v.string()),
});

export const AdminForcePasswordSchema = v.object({
	newPassword: PasswordSchema,
});

export const AdminLockAccountSchema = v.object({
	locked: v.boolean('Locked status must be a boolean.'),
});

// Admin App Schemas
export const AdminCreateAppSchema = v.object({
	id: v.pipe(v.string(), v.minLength(1), v.regex(/^[a-z0-9-]+$/, 'App ID must be lowercase, alphanumeric, or dashes.')),
	name: v.pipe(v.string(), v.minLength(1)),
	description: v.optional(v.string()),
	icon: v.optional(v.string()),
	prod_url: v.pipe(v.string(), v.url('Must be a valid URL')),
	dev_url: v.pipe(v.string(), v.url('Must be a valid URL')),
	allow_signups: v.union([v.literal(0), v.literal(1)]),
	allow_logins: v.union([v.literal(0), v.literal(1)]),
});

// v.partial makes all properties optional for PATCH requests
export const AdminUpdateAppSchema = v.partial(AdminCreateAppSchema);

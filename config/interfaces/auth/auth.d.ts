export interface AuthConfig {
    type: 'jwt' | 'session' | 'oauth';
    secret: string;
    expiresIn: string;
    algorithms: string[];
}
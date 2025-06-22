import { UserRepositoryImpl } from './user.repository.impl';
import { OAuthAccountRepositoryImpl } from './oauth-account.repository.impl';

export const userRepository = new UserRepositoryImpl();
export const oauthAccountRepository = new OAuthAccountRepositoryImpl();
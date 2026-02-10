## Phase 3: Authentication & Authorization

**Goal**: Implement JWT-based authentication with refresh tokens

**Prerequisites**: Phase 2 complete

**Complexity**: Complex

**Estimated Time**: 6-8 hours

### Tasks

#### Task 3.1: Define Authentication Errors

- [ ] Create `src/domain/user/UserErrors.ts`:

  ```typescript
  import { Data } from "effect";

  export class InvalidCredentials extends Data.TaggedError(
    "InvalidCredentials",
  )<{
    email: string;
  }> {}

  export class UserNotFound extends Data.TaggedError("UserNotFound")<{
    userId: string;
  }> {}

  export class UserAlreadyExists extends Data.TaggedError("UserAlreadyExists")<{
    email: string;
  }> {}

  export class InvalidToken extends Data.TaggedError("InvalidToken")<{
    tokenType: "access" | "refresh";
    reason: string;
  }> {}

  export class TokenExpired extends Data.TaggedError("TokenExpired")<{
    tokenType: "access" | "refresh";
  }> {}

  export class UnauthorizedError extends Data.TaggedError("UnauthorizedError")<{
    reason: string;
  }> {}

  export class ForbiddenError extends Data.TaggedError("ForbiddenError")<{
    requiredRole?: string;
  }> {}
  ```

#### Task 3.2: Create Password Hashing Service

- [ ] Create `src/infrastructure/crypto/PasswordService.ts`:

  ```typescript
  import { Effect } from "effect";
  import { hash, compare } from "@node-rs/bcrypt";

  export class PasswordService extends Effect.Service<PasswordService>()(
    "PasswordService",
    {
      effect: Effect.succeed({
        hash: (password: string) => Effect.promise(() => hash(password, 10)),

        verify: (password: string, hash: string) =>
          Effect.promise(() => compare(password, hash)),
      }),
      dependencies: [],
    },
  ) {}
  ```

#### Task 3.3: Create JWT Service

- [ ] Create `src/infrastructure/crypto/JwtService.ts`:

  ```typescript
  import { Effect, Config } from "effect";
  import { SignJWT, jwtVerify } from "jose";
  import { InvalidToken, TokenExpired } from "@domain/user/UserErrors";

  interface AccessTokenPayload {
    sub: string; // user ID
    role: "admin" | "staff";
    iat: number;
    exp: number;
  }

  export class JwtService extends Effect.Service<JwtService>()("JwtService", {
    effect: Effect.gen(function* () {
      const secret = yield* Config.secret("JWT_SECRET");
      const accessExpiry = yield* Config.string("JWT_ACCESS_EXPIRY");
      const refreshExpiry = yield* Config.string("JWT_REFRESH_EXPIRY");

      const secretKey = new TextEncoder().encode(secret.value);

      const signAccessToken = (userId: string, role: "admin" | "staff") =>
        Effect.promise(() =>
          new SignJWT({ sub: userId, role })
            .setProtectedHeader({ alg: "HS256" })
            .setIssuedAt()
            .setExpirationTime(accessExpiry)
            .sign(secretKey),
        );

      const verifyAccessToken = (token: string) =>
        Effect.tryPromise({
          try: () => jwtVerify(token, secretKey),
          catch: (error) => {
            if (error instanceof Error && error.message.includes("expired")) {
              return new TokenExpired({ tokenType: "access" });
            }
            return new InvalidToken({
              tokenType: "access",
              reason: String(error),
            });
          },
        }).pipe(Effect.map((result) => result.payload as AccessTokenPayload));

      return {
        signAccessToken,
        verifyAccessToken,
      };
    }),
    dependencies: [],
  }) {}
  ```

#### Task 3.4: Create Token Generation Utilities

- [ ] Create `src/infrastructure/crypto/TokenGenerator.ts`:

  ```typescript
  import { Effect } from "effect";
  import { randomBytes } from "crypto";
  import { hash } from "@node-rs/bcrypt";

  export const generateRefreshToken = () =>
    Effect.sync(() => randomBytes(32).toString("hex"));

  export const hashToken = (token: string) =>
    Effect.promise(() => hash(token, 10));
  ```

#### Task 3.5: Create CurrentUser Context

- [ ] Create `src/domain/user/CurrentUser.ts`:

  ```typescript
  import { Context } from "effect";

  export interface CurrentUser {
    id: string;
    role: "admin" | "staff";
  }

  export const CurrentUser = Context.GenericTag<CurrentUser>("CurrentUser");
  ```

#### Task 3.6: Create Authorization Guards

- [ ] Create `src/application/auth/AuthorizationGuards.ts`:

  ```typescript
  import { Effect } from "effect";
  import { CurrentUser } from "@domain/user/CurrentUser";
  import { ForbiddenError, UnauthorizedError } from "@domain/user/UserErrors";

  export const requireAuth = Effect.gen(function* () {
    const user = yield* Effect.serviceOption(CurrentUser);
    if (user._tag === "None") {
      return yield* Effect.fail(
        new UnauthorizedError({ reason: "Authentication required" }),
      );
    }
    return user.value;
  });

  export const requireAdmin = Effect.gen(function* () {
    const user = yield* requireAuth;
    if (user.role !== "admin") {
      return yield* Effect.fail(new ForbiddenError({ requiredRole: "admin" }));
    }
    return user;
  });

  export const requireStaffOrAdmin = Effect.gen(function* () {
    const user = yield* requireAuth;
    if (user.role !== "admin" && user.role !== "staff") {
      return yield* Effect.fail(new ForbiddenError());
    }
    return user;
  });
  ```

#### Task 3.7: Create Login Use Case

- [ ] Create `src/application/auth/LoginUseCase.ts`:

  ```typescript
  import { Effect } from "effect";
  import { UserRepository } from "@infrastructure/database/repositories/UserRepository";
  import { RefreshTokenRepository } from "@infrastructure/database/repositories/RefreshTokenRepository";
  import { PasswordService } from "@infrastructure/crypto/PasswordService";
  import { JwtService } from "@infrastructure/crypto/JwtService";
  import {
    generateRefreshToken,
    hashToken,
  } from "@infrastructure/crypto/TokenGenerator";
  import { InvalidCredentials } from "@domain/user/UserErrors";

  interface LoginRequest {
    email: string;
    password: string;
  }

  interface LoginResponse {
    accessToken: string;
    refreshToken: string;
    user: {
      id: string;
      email: string;
      role: string;
    };
  }

  export const login = (request: LoginRequest) =>
    Effect.gen(function* () {
      const userRepo = yield* UserRepository;
      const refreshTokenRepo = yield* RefreshTokenRepository;
      const passwordService = yield* PasswordService;
      const jwtService = yield* JwtService;

      // Find user by email
      const userOption = yield* userRepo.findByEmail(request.email);
      if (Option.isNone(userOption)) {
        return yield* Effect.fail(
          new InvalidCredentials({ email: request.email }),
        );
      }
      const user = userOption.value;

      // Verify password
      const isValid = yield* passwordService.verify(
        request.password,
        user.password_hash,
      );
      if (!isValid) {
        return yield* Effect.fail(
          new InvalidCredentials({ email: request.email }),
        );
      }

      // Generate access token
      const accessToken = yield* jwtService.signAccessToken(user.id, user.role);

      // Generate refresh token
      const refreshToken = yield* generateRefreshToken();
      const refreshTokenHash = yield* hashToken(refreshToken);

      // Store refresh token
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
      yield* refreshTokenRepo.insert({
        user_id: user.id,
        token_hash: refreshTokenHash,
        expires_at: expiresAt,
      });

      return {
        accessToken,
        refreshToken,
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
        },
      } satisfies LoginResponse;
    });
  ```

#### Task 3.8: Create Logout Use Case

- [ ] Create `src/application/auth/LogoutUseCase.ts`:

  ```typescript
  import { Effect } from "effect";
  import { RefreshTokenRepository } from "@infrastructure/database/repositories/RefreshTokenRepository";
  import { hashToken } from "@infrastructure/crypto/TokenGenerator";

  export const logout = (refreshToken: string) =>
    Effect.gen(function* () {
      const repo = yield* RefreshTokenRepository;
      const tokenHash = yield* hashToken(refreshToken);

      const tokenOption = yield* repo.findByTokenHash(tokenHash);
      if (Option.isSome(tokenOption)) {
        yield* repo.revoke(tokenOption.value.id);
      }
    });
  ```

#### Task 3.9: Create Refresh Token Use Case

- [ ] Create `src/application/auth/RefreshTokenUseCase.ts`:

  ```typescript
  import { Effect } from "effect";
  import { RefreshTokenRepository } from "@infrastructure/database/repositories/RefreshTokenRepository";
  import { UserRepository } from "@infrastructure/database/repositories/UserRepository";
  import { JwtService } from "@infrastructure/crypto/JwtService";
  import {
    generateRefreshToken,
    hashToken,
  } from "@infrastructure/crypto/TokenGenerator";
  import { InvalidToken, UserNotFound } from "@domain/user/UserErrors";

  export const refreshAccessToken = (oldRefreshToken: string) =>
    Effect.gen(function* () {
      const refreshTokenRepo = yield* RefreshTokenRepository;
      const userRepo = yield* UserRepository;
      const jwtService = yield* JwtService;

      // Hash and find refresh token
      const tokenHash = yield* hashToken(oldRefreshToken);
      const tokenOption = yield* refreshTokenRepo.findByTokenHash(tokenHash);

      if (Option.isNone(tokenOption)) {
        return yield* Effect.fail(
          new InvalidToken({
            tokenType: "refresh",
            reason: "Token not found or expired",
          }),
        );
      }
      const token = tokenOption.value;

      // Get user
      const userOption = yield* userRepo.findById(token.user_id);
      if (Option.isNone(userOption)) {
        return yield* Effect.fail(new UserNotFound({ userId: token.user_id }));
      }
      const user = userOption.value;

      // Revoke old refresh token
      yield* refreshTokenRepo.revoke(token.id);

      // Generate new tokens
      const accessToken = yield* jwtService.signAccessToken(user.id, user.role);
      const newRefreshToken = yield* generateRefreshToken();
      const newTokenHash = yield* hashToken(newRefreshToken);

      // Store new refresh token
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      yield* refreshTokenRepo.insert({
        user_id: user.id,
        token_hash: newTokenHash,
        expires_at: expiresAt,
      });

      return {
        accessToken,
        refreshToken: newRefreshToken,
      };
    });
  ```

#### Task 3.10: Create Authentication Middleware

- [ ] Create `src/infrastructure/http/middleware/auth.ts`:

  ```typescript
  import { Effect, Option } from "effect";
  import { JwtService } from "@infrastructure/crypto/JwtService";
  import { CurrentUser } from "@domain/user/CurrentUser";
  import { UnauthorizedError } from "@domain/user/UserErrors";

  export const extractAccessToken = (authHeader: string | undefined) =>
    Effect.gen(function* () {
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return yield* Effect.fail(
          new UnauthorizedError({
            reason: "Missing or invalid authorization header",
          }),
        );
      }
      return authHeader.slice(7); // Remove 'Bearer ' prefix
    });

  export const authMiddleware = <R, E, A>(
    effect: Effect.Effect<A, E, R | CurrentUser>,
  ): Effect.Effect<A, E | UnauthorizedError, R | JwtService> =>
    Effect.gen(function* () {
      const jwtService = yield* JwtService;

      // Extract token from request (implementation depends on HTTP setup)
      const token = yield* extractAccessToken(/* get from request */);

      // Verify token
      const payload = yield* jwtService.verifyAccessToken(token);

      // Inject CurrentUser into context
      const currentUser: CurrentUser = {
        id: payload.sub,
        role: payload.role,
      };

      return yield* effect.pipe(
        Effect.provideService(CurrentUser, currentUser),
      );
    });
  ```

#### Task 3.11: Write Authentication Tests

- [ ] Test password hashing and verification
- [ ] Test JWT signing and verification
- [ ] Test login use case (success and failure)
- [ ] Test logout use case
- [ ] Test refresh token use case
- [ ] Test authorization guards

### Key Files to Create

- Error definitions in `src/domain/user/UserErrors.ts`
- Crypto services in `src/infrastructure/crypto/`
- Auth use cases in `src/application/auth/`
- Authorization guards in `src/application/auth/AuthorizationGuards.ts`
- Auth middleware in `src/infrastructure/http/middleware/auth.ts`
- Tests in `test/application/auth/`

### Verification Steps

- [ ] Password hashing works correctly
- [ ] JWT tokens can be signed and verified
- [ ] Login returns valid tokens
- [ ] Refresh token rotation works
- [ ] Logout revokes tokens
- [ ] Authorization guards enforce role requirements
- [ ] All auth tests pass

### Deliverable

Working authentication system with:

- Password hashing service
- JWT service with token generation
- Login use case with token generation
- Logout use case with token revocation
- Refresh token use case with rotation
- Authorization guards (requireAuth, requireAdmin)
- Authentication middleware for HTTP requests
- Comprehensive test coverage

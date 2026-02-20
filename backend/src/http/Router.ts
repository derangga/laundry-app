import { HttpApiBuilder } from '@effect/platform'
import { Layer } from 'effect'
import { AppApi } from '@api/AppApi'
import { CustomerHandlersLive } from '@handlers/CustomerHandlers'
import { AuthHandlersLive } from '@handlers/AuthHandlers'
import { ServiceHandlersLive } from '@handlers/ServiceHandlers'
import { OrderHandlersLive } from '@handlers/OrderHandlers'
import { ReceiptHandlersLive } from '@handlers/ReceiptHandlers'
import { AnalyticsHandlersLive } from '@handlers/AnalyticsHandlers'
import { AuthAdminMiddlewareLive, AuthMiddlewareLive } from '@middleware/AuthMiddleware'
import { CustomerRepository } from '@repositories/CustomerRepository'
import { CustomerService } from 'src/usecase/customer/CustomerService'
import { UserRepository } from '@repositories/UserRepository'
import { RefreshTokenRepository } from '@repositories/RefreshTokenRepository'
import { OrderRepository } from '@repositories/OrderRepository'
import { OrderItemRepository } from '@repositories/OrderItemRepository'
import { ServiceRepository } from '@repositories/ServiceRepository'
import { AnalyticsRepository } from '@repositories/AnalyticsRepository'
import { LoginUseCase } from 'src/usecase/auth/LoginUseCase'
import { RefreshTokenUseCase } from 'src/usecase/auth/RefreshTokenUseCase'
import { LogoutUseCase } from 'src/usecase/auth/LogoutUseCase'
import { RegisterUserUseCase } from 'src/usecase/auth/RegisterUserUseCase'
import { BootstrapUseCase } from 'src/usecase/auth/BootstrapUseCase'
import { PasswordService } from 'src/usecase/auth/PasswordService'
import { JwtService } from 'src/usecase/auth/JwtService'
import { TokenGenerator } from 'src/usecase/auth/TokenGenerator'
import { AppLogger } from 'src/http/Logger'
import { LaundryServiceService } from 'src/usecase/order/LaundryServiceService'
import { OrderService } from 'src/usecase/order/OrderService'
import { ReceiptService } from '@usecase/receipt/ReceiptService'
import { AnalyticsService } from 'src/usecase/analytics/AnalyticsService'

const HandlersLive = Layer.mergeAll(
  AuthHandlersLive,
  CustomerHandlersLive,
  ServiceHandlersLive,
  OrderHandlersLive,
  ReceiptHandlersLive,
  AnalyticsHandlersLive
)

const MiddlewareLive = Layer.mergeAll(AuthMiddlewareLive, AuthAdminMiddlewareLive)

const UseCasesLive = Layer.mergeAll(
  LoginUseCase.Default,
  RefreshTokenUseCase.Default,
  LogoutUseCase.Default,
  RegisterUserUseCase.Default,
  BootstrapUseCase.Default,
  OrderService.Default,
  CustomerService.Default,
  LaundryServiceService.Default,
  ReceiptService.Default,
  AnalyticsService.Default
)

const RepositoriesLive = Layer.mergeAll(
  UserRepository.Default,
  RefreshTokenRepository.Default,
  CustomerRepository.Default,
  ServiceRepository.Default,
  OrderRepository.Default,
  OrderItemRepository.Default,
  AnalyticsRepository.Default
)

const InfraLive = Layer.mergeAll(
  JwtService.Default,
  TokenGenerator.Default,
  PasswordService.Default,
  AppLogger.Default
)

const ApiLive = HttpApiBuilder.api(AppApi).pipe(
  Layer.provide(HandlersLive),
  Layer.provide(MiddlewareLive),
  Layer.provide(UseCasesLive),
  Layer.provide(RepositoriesLive),
  Layer.provide(InfraLive)
)

export const createAppRouter = () => ApiLive

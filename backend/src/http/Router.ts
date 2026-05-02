import { HttpApiBuilder } from '@effect/platform'
import { Layer } from 'effect'
import { AppApi } from '@api/AppApi'
import { HealthHandlersLive } from '@handlers/HealthHandlers'
import { CustomerHandlersLive } from '@handlers/CustomerHandlers'
import { AuthHandlersLive } from '@handlers/AuthHandlers'
import { ServiceHandlersLive } from '@handlers/ServiceHandlers'
import { OrderHandlersLive } from '@handlers/OrderHandlers'
import { ReceiptHandlersLive } from '@handlers/ReceiptHandlers'
import { AnalyticsHandlersLive } from '@handlers/AnalyticsHandlers'
import { UserHandlersLive } from '@handlers/UserHandlers'
import { AuthAdminMiddlewareLive, AuthMiddlewareLive } from '@middleware/AuthMiddleware'
import { CustomerRepository } from '@repositories/CustomerRepository'
import { FindCustomerByPhoneUseCase } from 'src/usecase/customer/FindCustomerByPhoneUseCase'
import { CheckCustomerExistsUseCase } from 'src/usecase/customer/CheckCustomerExistsUseCase'
import { CreateCustomerUseCase } from 'src/usecase/customer/CreateCustomerUseCase'
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
import { FindActiveServicesUseCase } from 'src/usecase/order/FindActiveServicesUseCase'
import { FindAllServicesUseCase } from 'src/usecase/order/FindAllServicesUseCase'
import { FindServiceByIdUseCase } from 'src/usecase/order/FindServiceByIdUseCase'
import { CreateServiceUseCase } from 'src/usecase/order/CreateServiceUseCase'
import { UpdateServiceUseCase } from 'src/usecase/order/UpdateServiceUseCase'
import { SoftDeleteServiceUseCase } from 'src/usecase/order/SoftDeleteServiceUseCase'
import { CreateOrderUseCase } from 'src/usecase/order/CreateOrderUseCase'
import { CreateWalkInOrderUseCase } from 'src/usecase/order/CreateWalkInOrderUseCase'
import { FindOrderByIdUseCase } from 'src/usecase/order/FindOrderByIdUseCase'
import { UpdateOrderStatusUseCase } from 'src/usecase/order/UpdateOrderStatusUseCase'
import { UpdatePaymentStatusUseCase } from 'src/usecase/order/UpdatePaymentStatusUseCase'
import { FindOrdersByCustomerIdUseCase } from 'src/usecase/order/FindOrdersByCustomerIdUseCase'
import { ReceiptService } from '@usecase/receipt/ReceiptService'
import { GetWeeklyAnalyticsUseCase } from 'src/usecase/analytics/GetWeeklyAnalyticsUseCase'
import { GetDashboardStatsUseCase } from 'src/usecase/analytics/GetDashboardStatsUseCase'
import { ListUsersUseCase } from 'src/usecase/user/ListUsersUseCase'
import { UpdateUserUseCase } from 'src/usecase/user/UpdateUserUseCase'
import { DeleteUserUseCase } from 'src/usecase/user/DeleteUserUseCase'

const HandlersLive = Layer.mergeAll(
  HealthHandlersLive,
  AuthHandlersLive,
  CustomerHandlersLive,
  ServiceHandlersLive,
  OrderHandlersLive,
  ReceiptHandlersLive,
  AnalyticsHandlersLive,
  UserHandlersLive
)

const MiddlewareLive = Layer.mergeAll(AuthMiddlewareLive, AuthAdminMiddlewareLive)

const UseCasesLive = Layer.mergeAll(
  LoginUseCase.Default,
  RefreshTokenUseCase.Default,
  LogoutUseCase.Default,
  RegisterUserUseCase.Default,
  BootstrapUseCase.Default,
  FindCustomerByPhoneUseCase.Default,
  CheckCustomerExistsUseCase.Default,
  CreateCustomerUseCase.Default,
  FindActiveServicesUseCase.Default,
  FindAllServicesUseCase.Default,
  FindServiceByIdUseCase.Default,
  CreateServiceUseCase.Default,
  UpdateServiceUseCase.Default,
  SoftDeleteServiceUseCase.Default,
  CreateOrderUseCase.Default,
  CreateWalkInOrderUseCase.Default,
  FindOrderByIdUseCase.Default,
  UpdateOrderStatusUseCase.Default,
  UpdatePaymentStatusUseCase.Default,
  FindOrdersByCustomerIdUseCase.Default,
  ReceiptService.Default,
  GetWeeklyAnalyticsUseCase.Default,
  GetDashboardStatsUseCase.Default,
  ListUsersUseCase.Default,
  UpdateUserUseCase.Default,
  DeleteUserUseCase.Default
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

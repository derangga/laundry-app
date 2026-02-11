import { describe, it, expect } from "vitest"
import { Effect, Layer, Option } from "effect"
import {
  OrderRepository,
  OrderInsertData,
  OrderFilterOptions,
} from "@infrastructure/database/repositories/OrderRepository"
import {
  Order,
  OrderId,
  OrderStatus,
  PaymentStatus,
  OrderWithDetails,
  OrderSummary,
} from "@domain/Order"
import { CustomerId } from "@domain/Customer"
import { UserId } from "@domain/User"

// Create a mock order
const createMockOrder = (overrides: Partial<Order> = {}): Order =>
  ({
    id: "order-123" as OrderId,
    order_number: "ORD-001",
    customer_id: "customer-123" as CustomerId,
    status: "received" as OrderStatus,
    payment_status: "unpaid" as PaymentStatus,
    total_price: 50000,
    created_by: "user-123" as UserId,
    created_at: new Date(),
    updated_at: new Date(),
    ...overrides,
  }) as unknown as Order

// Create a mock OrderRepository
const createMockOrderRepo = (
  orders: Order[] = []
) =>
  Layer.succeed(OrderRepository, {
    findById: (id: OrderId) =>
      Effect.succeed(
        Option.fromNullable(orders.find((o) => o.id === id))
      ),
    findByOrderNumber: (orderNumber: string) =>
      Effect.succeed(
        Option.fromNullable(orders.find((o) => o.order_number === orderNumber))
      ),
    findByCustomerId: (customerId: CustomerId) =>
      Effect.succeed(
        orders.filter((o) => o.customer_id === customerId)
      ),
    findWithFilters: (options: OrderFilterOptions) => {
      let filtered = [...orders]
      if (options.status) {
        filtered = filtered.filter((o) => o.status === options.status)
      }
      if (options.payment_status) {
        filtered = filtered.filter((o) => o.payment_status === options.payment_status)
      }
      if (options.limit) {
        filtered = filtered.slice(0, options.limit)
      }
      return Effect.succeed(filtered)
    },
    insert: (data: OrderInsertData) =>
      Effect.succeed(
        createMockOrder({
          order_number: data.order_number,
          customer_id: data.customer_id,
          status: data.status,
          payment_status: data.payment_status,
          total_price: data.total_price,
          created_by: data.created_by,
        })
      ),
    findWithDetails: (options: OrderFilterOptions = {}) => {
      let filtered = [...orders]
      if (options.status) {
        filtered = filtered.filter((o) => o.status === options.status)
      }
      if (options.payment_status) {
        filtered = filtered.filter((o) => o.payment_status === options.payment_status)
      }
      if (options.limit) {
        filtered = filtered.slice(0, options.limit)
      }
      return Effect.succeed(
        filtered.map((o) => ({
          ...o,
          customer_name: "Mock Customer",
          customer_phone: "+628123456789",
          created_by_name: "Mock User",
        })) as OrderWithDetails[]
      )
    },
    findSummaries: (options: Pick<OrderFilterOptions, 'payment_status' | 'start_date' | 'end_date'> = {}) => {
      let filtered = [...orders]
      if (options.payment_status) {
        filtered = filtered.filter((o) => o.payment_status === options.payment_status)
      }
      return Effect.succeed(
        filtered.map((o) => ({
          id: o.id,
          order_number: o.order_number,
          total_price: o.total_price,
          payment_status: o.payment_status,
          created_at: o.created_at,
        })) as OrderSummary[]
      )
    },
    updateStatus: (_id: OrderId, _status: OrderStatus) =>
      Effect.succeed(void 0),
    updatePaymentStatus: (_id: OrderId, _paymentStatus: PaymentStatus) =>
      Effect.succeed(void 0),
    updateTotalPrice: (_id: OrderId, _totalPrice: number) =>
      Effect.succeed(void 0),
  } as unknown as OrderRepository)

describe("OrderRepository", () => {
  const mockOrder = createMockOrder()

  describe("findById", () => {
    it("should return Some when order exists", async () => {
      const MockRepo = createMockOrderRepo([mockOrder])

      const program = Effect.gen(function* () {
        const repo = yield* OrderRepository
        return yield* repo.findById("order-123" as OrderId)
      })

      const result = await Effect.runPromise(Effect.provide(program, MockRepo))
      expect(Option.isSome(result)).toBe(true)
      if (Option.isSome(result)) {
        expect(result.value.id).toBe("order-123")
        expect(result.value.order_number).toBe("ORD-001")
      }
    })

    it("should return None when order does not exist", async () => {
      const MockRepo = createMockOrderRepo([])

      const program = Effect.gen(function* () {
        const repo = yield* OrderRepository
        return yield* repo.findById("nonexistent" as OrderId)
      })

      const result = await Effect.runPromise(Effect.provide(program, MockRepo))
      expect(Option.isNone(result)).toBe(true)
    })
  })

  describe("findByOrderNumber", () => {
    it("should return Some when order number exists", async () => {
      const MockRepo = createMockOrderRepo([mockOrder])

      const program = Effect.gen(function* () {
        const repo = yield* OrderRepository
        return yield* repo.findByOrderNumber("ORD-001")
      })

      const result = await Effect.runPromise(Effect.provide(program, MockRepo))
      expect(Option.isSome(result)).toBe(true)
      if (Option.isSome(result)) {
        expect(result.value.order_number).toBe("ORD-001")
      }
    })

    it("should return None when order number not found", async () => {
      const MockRepo = createMockOrderRepo([mockOrder])

      const program = Effect.gen(function* () {
        const repo = yield* OrderRepository
        return yield* repo.findByOrderNumber("ORD-999")
      })

      const result = await Effect.runPromise(Effect.provide(program, MockRepo))
      expect(Option.isNone(result)).toBe(true)
    })
  })

  describe("findByCustomerId", () => {
    it("should return orders for customer", async () => {
      const orders = [
        createMockOrder({ id: "1" as OrderId, customer_id: "customer-123" as CustomerId }),
        createMockOrder({ id: "2" as OrderId, customer_id: "customer-123" as CustomerId }),
        createMockOrder({ id: "3" as OrderId, customer_id: "customer-456" as CustomerId }),
      ]
      const MockRepo = createMockOrderRepo(orders)

      const program = Effect.gen(function* () {
        const repo = yield* OrderRepository
        return yield* repo.findByCustomerId("customer-123" as CustomerId)
      })

      const result = await Effect.runPromise(Effect.provide(program, MockRepo))
      expect(result.length).toBe(2)
    })
  })

  describe("findWithFilters", () => {
    it("should filter by status", async () => {
      const orders = [
        createMockOrder({ id: "1" as OrderId, status: "received" as OrderStatus }),
        createMockOrder({ id: "2" as OrderId, status: "in_progress" as OrderStatus }),
        createMockOrder({ id: "3" as OrderId, status: "received" as OrderStatus }),
      ]
      const MockRepo = createMockOrderRepo(orders)

      const program = Effect.gen(function* () {
        const repo = yield* OrderRepository
        return yield* repo.findWithFilters({ status: "received" as OrderStatus })
      })

      const result = await Effect.runPromise(Effect.provide(program, MockRepo))
      expect(result.length).toBe(2)
    })

    it("should filter by payment status", async () => {
      const orders = [
        createMockOrder({ id: "1" as OrderId, payment_status: "paid" as PaymentStatus }),
        createMockOrder({ id: "2" as OrderId, payment_status: "unpaid" as PaymentStatus }),
      ]
      const MockRepo = createMockOrderRepo(orders)

      const program = Effect.gen(function* () {
        const repo = yield* OrderRepository
        return yield* repo.findWithFilters({ payment_status: "paid" as PaymentStatus })
      })

      const result = await Effect.runPromise(Effect.provide(program, MockRepo))
      expect(result.length).toBe(1)
    })

    it("should apply limit", async () => {
      const orders = [
        createMockOrder({ id: "1" as OrderId }),
        createMockOrder({ id: "2" as OrderId }),
        createMockOrder({ id: "3" as OrderId }),
      ]
      const MockRepo = createMockOrderRepo(orders)

      const program = Effect.gen(function* () {
        const repo = yield* OrderRepository
        return yield* repo.findWithFilters({ limit: 2 })
      })

      const result = await Effect.runPromise(Effect.provide(program, MockRepo))
      expect(result.length).toBe(2)
    })
  })

  describe("insert", () => {
    it("should create a new order", async () => {
      const MockRepo = createMockOrderRepo([])

      const input: OrderInsertData = {
        order_number: "ORD-002",
        customer_id: "customer-456" as CustomerId,
        status: "received" as OrderStatus,
        payment_status: "unpaid" as PaymentStatus,
        total_price: 75000,
        created_by: "user-123" as UserId,
      }

      const program = Effect.gen(function* () {
        const repo = yield* OrderRepository
        return yield* repo.insert(input)
      })

      const result = await Effect.runPromise(Effect.provide(program, MockRepo))
      expect(result.order_number).toBe("ORD-002")
      expect(result.total_price).toBe(75000)
    })
  })

  describe("updateStatus", () => {
    it("should update order status", async () => {
      const MockRepo = createMockOrderRepo([mockOrder])

      const program = Effect.gen(function* () {
        const repo = yield* OrderRepository
        return yield* repo.updateStatus("order-123" as OrderId, "in_progress" as OrderStatus)
      })

      // Should complete without throwing
      await Effect.runPromise(Effect.provide(program, MockRepo))
    })
  })

  describe("updatePaymentStatus", () => {
    it("should update payment status", async () => {
      const MockRepo = createMockOrderRepo([mockOrder])

      const program = Effect.gen(function* () {
        const repo = yield* OrderRepository
        return yield* repo.updatePaymentStatus("order-123" as OrderId, "paid" as PaymentStatus)
      })

      // Should complete without throwing
      await Effect.runPromise(Effect.provide(program, MockRepo))
    })
  })

  describe("updateTotalPrice", () => {
    it("should update total price", async () => {
      const MockRepo = createMockOrderRepo([mockOrder])

      const program = Effect.gen(function* () {
        const repo = yield* OrderRepository
        return yield* repo.updateTotalPrice("order-123" as OrderId, 100000)
      })

      // Should complete without throwing
      await Effect.runPromise(Effect.provide(program, MockRepo))
    })
  })

  describe("findWithDetails", () => {
    it("should return orders with customer and user details", async () => {
      const orders = [
        createMockOrder({ id: "1" as OrderId }),
        createMockOrder({ id: "2" as OrderId }),
      ]
      const MockRepo = createMockOrderRepo(orders)

      const program = Effect.gen(function* () {
        const repo = yield* OrderRepository
        return yield* repo.findWithDetails()
      })

      const result = await Effect.runPromise(Effect.provide(program, MockRepo))
      expect(result.length).toBe(2)
      expect(result[0]).toHaveProperty("customer_name")
      expect(result[0]).toHaveProperty("customer_phone")
      expect(result[0]).toHaveProperty("created_by_name")
    })
  })

  describe("findSummaries", () => {
    it("should return order summaries for analytics", async () => {
      const orders = [
        createMockOrder({ id: "1" as OrderId, payment_status: "paid" as PaymentStatus }),
        createMockOrder({ id: "2" as OrderId, payment_status: "unpaid" as PaymentStatus }),
        createMockOrder({ id: "3" as OrderId, payment_status: "paid" as PaymentStatus }),
      ]
      const MockRepo = createMockOrderRepo(orders)

      const program = Effect.gen(function* () {
        const repo = yield* OrderRepository
        return yield* repo.findSummaries({ payment_status: "paid" as PaymentStatus })
      })

      const result = await Effect.runPromise(Effect.provide(program, MockRepo))
      expect(result.length).toBe(2)
      expect(result[0]).toHaveProperty("id")
      expect(result[0]).toHaveProperty("order_number")
      expect(result[0]).toHaveProperty("total_price")
      expect(result[0]).toHaveProperty("payment_status")
      expect(result[0]).toHaveProperty("created_at")
      expect(result[0]).not.toHaveProperty("customer_id")
      expect(result[0]).not.toHaveProperty("status")
    })
  })
})

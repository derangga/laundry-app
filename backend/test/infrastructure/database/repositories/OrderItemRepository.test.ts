import { describe, it, expect } from "vitest"
import { Effect, Layer, Option } from "effect"
import {
  OrderItemRepository,
  OrderItemInsertData,
} from "@infrastructure/database/repositories/OrderItemRepository"
import { OrderItem, OrderItemId } from "@domain/OrderItem"
import { OrderId } from "@domain/Order"
import { ServiceId } from "@domain/LaundryService"

// Create a mock order item
const createMockOrderItem = (overrides: Partial<OrderItem> = {}): OrderItem =>
  ({
    id: "item-123" as OrderItemId,
    order_id: "order-123" as OrderId,
    service_id: "service-123" as ServiceId,
    quantity: 5,
    price_at_order: 10000,
    subtotal: 50000,
    created_at: new Date(),
    ...overrides,
  }) as unknown as OrderItem

// Create a mock OrderItemRepository
const createMockOrderItemRepo = (
  items: OrderItem[] = []
) =>
  Layer.succeed(OrderItemRepository, {
    findById: (id: OrderItemId) =>
      Effect.succeed(
        Option.fromNullable(items.find((i) => i.id === id))
      ),
    findByOrderId: (orderId: OrderId) =>
      Effect.succeed(
        items.filter((i) => i.order_id === orderId)
      ),
    insert: (data: OrderItemInsertData) =>
      Effect.succeed(
        createMockOrderItem({
          order_id: data.order_id,
          service_id: data.service_id,
          quantity: data.quantity,
          price_at_order: data.price_at_order,
          subtotal: data.subtotal,
        })
      ),
    insertMany: (itemsData: readonly OrderItemInsertData[]) =>
      Effect.succeed(
        itemsData.map((data, index) =>
          createMockOrderItem({
            id: `item-${index}` as OrderItemId,
            order_id: data.order_id,
            service_id: data.service_id,
            quantity: data.quantity,
            price_at_order: data.price_at_order,
            subtotal: data.subtotal,
          })
        )
      ),
    deleteByOrderId: (_orderId: OrderId) =>
      Effect.succeed(void 0),
  } as unknown as OrderItemRepository)

describe("OrderItemRepository", () => {
  const mockItem = createMockOrderItem()

  describe("findById", () => {
    it("should return Some when order item exists", async () => {
      const MockRepo = createMockOrderItemRepo([mockItem])

      const program = Effect.gen(function* () {
        const repo = yield* OrderItemRepository
        return yield* repo.findById("item-123" as OrderItemId)
      })

      const result = await Effect.runPromise(Effect.provide(program, MockRepo))
      expect(Option.isSome(result)).toBe(true)
      if (Option.isSome(result)) {
        expect(result.value.id).toBe("item-123")
        expect(result.value.subtotal).toBe(50000)
      }
    })

    it("should return None when order item does not exist", async () => {
      const MockRepo = createMockOrderItemRepo([])

      const program = Effect.gen(function* () {
        const repo = yield* OrderItemRepository
        return yield* repo.findById("nonexistent" as OrderItemId)
      })

      const result = await Effect.runPromise(Effect.provide(program, MockRepo))
      expect(Option.isNone(result)).toBe(true)
    })
  })

  describe("findByOrderId", () => {
    it("should return all items for an order", async () => {
      const items = [
        createMockOrderItem({ id: "1" as OrderItemId, order_id: "order-123" as OrderId }),
        createMockOrderItem({ id: "2" as OrderItemId, order_id: "order-123" as OrderId }),
        createMockOrderItem({ id: "3" as OrderItemId, order_id: "order-456" as OrderId }),
      ]
      const MockRepo = createMockOrderItemRepo(items)

      const program = Effect.gen(function* () {
        const repo = yield* OrderItemRepository
        return yield* repo.findByOrderId("order-123" as OrderId)
      })

      const result = await Effect.runPromise(Effect.provide(program, MockRepo))
      expect(result.length).toBe(2)
    })

    it("should return empty array when no items for order", async () => {
      const MockRepo = createMockOrderItemRepo([])

      const program = Effect.gen(function* () {
        const repo = yield* OrderItemRepository
        return yield* repo.findByOrderId("order-999" as OrderId)
      })

      const result = await Effect.runPromise(Effect.provide(program, MockRepo))
      expect(result.length).toBe(0)
    })
  })

  describe("insert", () => {
    it("should create a new order item", async () => {
      const MockRepo = createMockOrderItemRepo([])

      const input: OrderItemInsertData = {
        order_id: "order-456" as OrderId,
        service_id: "service-789" as ServiceId,
        quantity: 3,
        price_at_order: 15000,
        subtotal: 45000,
      }

      const program = Effect.gen(function* () {
        const repo = yield* OrderItemRepository
        return yield* repo.insert(input)
      })

      const result = await Effect.runPromise(Effect.provide(program, MockRepo))
      expect(result.order_id).toBe("order-456")
      expect(result.quantity).toBe(3)
      expect(result.subtotal).toBe(45000)
    })
  })

  describe("insertMany", () => {
    it("should create multiple order items", async () => {
      const MockRepo = createMockOrderItemRepo([])

      const inputs: OrderItemInsertData[] = [
        {
          order_id: "order-123" as OrderId,
          service_id: "service-1" as ServiceId,
          quantity: 2,
          price_at_order: 10000,
          subtotal: 20000,
        },
        {
          order_id: "order-123" as OrderId,
          service_id: "service-2" as ServiceId,
          quantity: 1,
          price_at_order: 25000,
          subtotal: 25000,
        },
      ]

      const program = Effect.gen(function* () {
        const repo = yield* OrderItemRepository
        return yield* repo.insertMany(inputs)
      })

      const result = await Effect.runPromise(Effect.provide(program, MockRepo))
      expect(result.length).toBe(2)
      expect(result[0]?.quantity).toBe(2)
      expect(result[1]?.quantity).toBe(1)
    })

    it("should return empty array when no items to insert", async () => {
      const MockRepo = createMockOrderItemRepo([])

      const program = Effect.gen(function* () {
        const repo = yield* OrderItemRepository
        return yield* repo.insertMany([])
      })

      const result = await Effect.runPromise(Effect.provide(program, MockRepo))
      expect(result.length).toBe(0)
    })
  })

  describe("deleteByOrderId", () => {
    it("should delete all items for an order", async () => {
      const items = [
        createMockOrderItem({ id: "1" as OrderItemId, order_id: "order-123" as OrderId }),
        createMockOrderItem({ id: "2" as OrderItemId, order_id: "order-123" as OrderId }),
      ]
      const MockRepo = createMockOrderItemRepo(items)

      const program = Effect.gen(function* () {
        const repo = yield* OrderItemRepository
        return yield* repo.deleteByOrderId("order-123" as OrderId)
      })

      // Should complete without throwing
      await Effect.runPromise(Effect.provide(program, MockRepo))
    })
  })
})

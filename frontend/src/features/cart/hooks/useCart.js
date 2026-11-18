import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { cartService } from '../services/cartService.js';
import { queryKeys } from '../../../lib/queryClient.js';
import { useAuth } from '../../../context/AuthProvider.jsx';
import { ROLES } from '../../../lib/constants.js';

export const useCart = () => {
  const queryClient = useQueryClient();
  const { isAuthenticated, role } = useAuth();

  const isCustomer = isAuthenticated && role === ROLES.CUSTOMER;

  // 1. Fetch Cart
  const {
    data: cart,
    isLoading,
    isFetching,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: queryKeys.cart.all,
    queryFn: cartService.getCart,
    enabled: isCustomer,
    staleTime: 1000 * 30, // 30 seconds
  });

  // 2. Add Item Mutation
  const addItemMutation = useMutation({
    mutationFn: ({ product, quantity = 1 }) =>
      cartService.addItem({ product, quantity }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.cart.all });
    },
  });

  // 3. Update Quantity Mutation (with optimistic UI update)
  const updateQuantityMutation = useMutation({
    mutationFn: ({ itemId, quantity }) =>
      cartService.updateItemQuantity(itemId, quantity),
    onMutate: async ({ itemId, quantity }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.cart.all });
      const previousCart = queryClient.getQueryData(queryKeys.cart.all);

      if (previousCart && previousCart.items) {
        const updatedItems = previousCart.items.map((item) => {
          if (item.id === itemId) {
            const price = parseFloat(item.product_price) || 0;
            return {
              ...item,
              quantity,
              subtotal: price * quantity,
            };
          }
          return item;
        });

        const newTotalPrice = updatedItems.reduce(
          (acc, item) => acc + (parseFloat(item.subtotal) || 0),
          0
        );
        const newTotalItems = updatedItems.reduce(
          (acc, item) => acc + (item.quantity || 0),
          0
        );

        queryClient.setQueryData(queryKeys.cart.all, {
          ...previousCart,
          items: updatedItems,
          total_price: newTotalPrice,
          total_items: newTotalItems,
        });
      }

      return { previousCart };
    },
    onError: (_err, _variables, context) => {
      if (context?.previousCart) {
        queryClient.setQueryData(queryKeys.cart.all, context.previousCart);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.cart.all });
    },
  });

  // 4. Remove Item Mutation (with optimistic UI update)
  const removeItemMutation = useMutation({
    mutationFn: (itemId) => cartService.removeItem(itemId),
    onMutate: async (itemId) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.cart.all });
      const previousCart = queryClient.getQueryData(queryKeys.cart.all);

      if (previousCart && previousCart.items) {
        const updatedItems = previousCart.items.filter((item) => item.id !== itemId);
        const newTotalPrice = updatedItems.reduce(
          (acc, item) => acc + (parseFloat(item.subtotal) || 0),
          0
        );
        const newTotalItems = updatedItems.reduce(
          (acc, item) => acc + (item.quantity || 0),
          0
        );

        queryClient.setQueryData(queryKeys.cart.all, {
          ...previousCart,
          items: updatedItems,
          total_price: newTotalPrice,
          total_items: newTotalItems,
        });
      }

      return { previousCart };
    },
    onError: (_err, _variables, context) => {
      if (context?.previousCart) {
        queryClient.setQueryData(queryKeys.cart.all, context.previousCart);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.cart.all });
    },
  });

  const items = cart?.items || [];
  const totalItems = cart?.total_items ?? items.reduce((acc, it) => acc + (it.quantity || 0), 0);
  const totalPrice = parseFloat(cart?.total_price) || items.reduce((acc, it) => acc + (parseFloat(it.subtotal) || 0), 0);

  // Check for unavailable or out-of-stock items
  const unavailableItems = items.filter(
    (item) => !item.is_available || (item.product_stock !== undefined && item.quantity > item.product_stock)
  );
  const hasUnavailableItems = unavailableItems.length > 0;

  return {
    cart,
    items,
    totalItems,
    totalPrice,
    isLoading: isCustomer && isLoading,
    isFetching,
    isError,
    error,
    refetch,
    isCustomer,
    isAuthenticated,
    hasUnavailableItems,
    unavailableItems,
    // Actions
    addItem: addItemMutation.mutateAsync,
    isAdding: addItemMutation.isPending,
    updateQuantity: updateQuantityMutation.mutateAsync,
    isUpdating: updateQuantityMutation.isPending,
    removeItem: removeItemMutation.mutateAsync,
    isRemoving: removeItemMutation.isPending,
  };
};

export default useCart;

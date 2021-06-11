import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart')

     if (storagedCart) {
        return JSON.parse(storagedCart)
     }
    

    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      // Verifica se o produto existe e chama a api
      const mountCart = [...cart];
      const mountExist = mountCart.find(product => product.id === productId);
      const getStock = await api.get(`/stock/${productId}`);

      const stock = getStock.data.amount;

      // Verifica se tem a quantidade de produtos no stock
      const currentStock = mountExist ? mountExist.amount : 0;

      // Seta o amount atual + 1 se existir
      const amount = currentStock + 1;

      if (amount > stock) {
        toast.error('Quantidade solicitada fora de estoque')
        return;
      }

      if (mountExist) {
        mountExist.amount = amount;
      } else {
        const product = await api.get(`/products/${productId}`);
        
        // Conceito de imutabilidade do React
        const newProduct = {
          ...product.data,
          amount: 1
        }
        mountCart.push(newProduct);
      }
      // Setando no estado do contexto o mount cart
      setCart(mountCart);
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(mountCart))
    } catch {
      toast.error('Erro na adição do produto')
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const updateCart = [...cart]
      const productFind = updateCart.findIndex(product => product.id === productId)

      if (productFind >= 0) {
        updateCart.splice(productFind, 1);
        setCart(updateCart)

        localStorage.setItem('@RocketShoes:cart', JSON.stringify(updateCart))
      } else {
        throw Error();
      }
    } catch {
      toast.error('Erro na remoção do produto')
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
       if (amount <= 0) {
         return;
       }

       const stock = await api.get(`/stock/${productId}`);

       const amountStock = stock.data.amount;

       if (amount > amountStock) {
         toast.error('Quantidade solicitada fora de estoque');
         return;
       }
       // pegando dados existentes no contexto
       const updateCart = [...cart];
       // Verificando no array se existe o produto
       const productExist = updateCart.find(product => product.id === productId);

       if (productExist) {
         productExist.amount = amount;
         setCart(updateCart);
         localStorage.setItem('@RocketShoes:cart', JSON.stringify(updateCart));
       } else {
         throw Error();
       }
    } catch {
      toast.error('Erro na alteração de quantidade do produto')
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}

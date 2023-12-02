import { validate as uuidValidate } from "uuid";
export type Product = {
  description: string;
  id: string;
  price: number;
  title: string;
  count: number;
};

export const isProduct = (product: unknown): product is Product => {
  return (
    typeof product === "object" &&
    product !== null &&
    "id" in product &&
    typeof product.id === "string" &&
    uuidValidate(product.id) &&
    "title" in product &&
    typeof product.title === "string" &&
    product.title.length > 0 &&
    "description" in product &&
    typeof product.description === "string" &&
    "price" in product &&
    typeof product.price === "number" &&
    product.price > 0 &&
    "count" in product &&
    typeof product.count === "number" &&
    product.count >= 0
  );
};

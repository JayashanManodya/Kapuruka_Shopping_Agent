'use client'

import { Gift, Flower, Cake, Square, ShoppingCart, Truck } from 'lucide-react'

const categories = [
  { name: 'Birthday Gifts' },
  { name: 'Flowers' },
  { name: 'Cakes' },
  { name: 'Chocolates' },
  { name: 'Groceries' },
  { name: 'Check Delivery' },
]

export function Categories() {
  return (
    <div className="w-full">
      <div className="flex flex-wrap gap-1 md:gap-2 justify-center">
        {categories.map((category) => (
          <button
            key={category.name}
            className="px-2 md:px-3 py-1 rounded-full font-medium text-white text-xs whitespace-nowrap transition-all hover:shadow-lg"
            style={{ backgroundColor: '#5322B8' }}
          >
            {category.name}
          </button>
        ))}
      </div>
    </div>
  )
}

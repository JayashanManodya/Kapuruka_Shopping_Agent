# Kapruka MCP Developer Reference

> Generated from the discovered Kapruka MCP server tool definitions.

## Server Information

  Item             Value
  ---------------- -------------------------------
  Server URL       `https://mcp.kapruka.com/mcp`
  Transport        Streamable HTTP
  Authentication   None
  Prompts          0
  Resources        0
  Tools            7

------------------------------------------------------------------------

# Architecture

``` text
User
   │
Frontend (React)
   │
FastAPI Backend
   │
LangGraph Agent
   │
MCP Client
   │
https://mcp.kapruka.com/mcp
   │
Kapruka Backend
```

------------------------------------------------------------------------

# Tool Execution Flow

1.  Connect to MCP server
2.  Initialize session
3.  Discover tools
4.  Call tool with:

``` json
{
  "params": {
    "...": "..."
  }
}
```

5.  Receive JSON/Markdown response

------------------------------------------------------------------------

# Tool Summary

  Tool                           Purpose
  ------------------------------ -----------------------
  kapruka_list_categories        Browse categories
  kapruka_search_products        Search products
  kapruka_get_product            Product details
  kapruka_list_delivery_cities   List delivery cities
  kapruka_check_delivery         Delivery availability
  kapruka_create_order           Guest checkout
  kapruka_track_order            Track paid orders

------------------------------------------------------------------------

# 1. kapruka_list_categories

## Purpose

Returns the Kapruka category hierarchy.

## Arguments

  Parameter         Type     Required   Default
  ----------------- -------- ---------- ----------
  depth             int      No         1
  response_format   string   No         markdown

### Response

``` json
{
  "categories":[
    {
      "name":"",
      "url":"",
      "children":[]
    }
  ]
}
```

### Typical Use

-   Populate category menu
-   Discover categories before searching

------------------------------------------------------------------------

# 2. kapruka_search_products

## Purpose

Search purchasable products.

## Parameters

  Parameter         Required
  ----------------- ----------
  q                 Yes
  category          No
  limit             No
  cursor            No
  currency          No
  min_price         No
  max_price         No
  in_stock_only     No
  sort              No
  include_stubs     No
  response_format   No

### Response

Each result contains

-   id
-   name
-   summary
-   image_url
-   category
-   price
-   stock
-   url

### Workflow

Search → choose product id → call get_product

------------------------------------------------------------------------

# 3. kapruka_get_product

## Purpose

Retrieve full product details.

### Required

-   product_id

### Optional

-   currency
-   type
-   response_format

### Returns

-   description
-   variants
-   images
-   shipping
-   attributes
-   stock
-   price
-   product URL

------------------------------------------------------------------------

# 4. kapruka_list_delivery_cities

## Purpose

Returns valid delivery cities.

### Parameters

-   query
-   limit
-   response_format

### Returns

``` json
{
  "cities":[
    {
      "name":"",
      "aliases":[]
    }
  ]
}
```

Use the returned city name in `kapruka_check_delivery`.

------------------------------------------------------------------------

# 5. kapruka_check_delivery

## Purpose

Verify whether delivery is available.

### Required

-   city

### Optional

-   delivery_date
-   product_id
-   response_format

### Returns

-   availability
-   delivery fee
-   next available date
-   perishable warning

------------------------------------------------------------------------

# 6. kapruka_create_order

## Purpose

Creates a guest checkout.

## Required Objects

-   cart
-   recipient
-   delivery
-   sender

## Optional

-   gift_message
-   currency
-   response_format

### Cart

-   product_id
-   quantity
-   icing_text

### Recipient

-   name
-   phone

### Delivery

-   address
-   city
-   date
-   location_type
-   instructions

### Sender

-   name
-   anonymous

### Returns

-   checkout_url
-   order_ref
-   expires_at
-   totals

**Important**

The returned `order_ref` is **not** the order number used for tracking.

------------------------------------------------------------------------

# 7. kapruka_track_order

## Purpose

Track a paid order.

### Required

-   order_number

### Returns

-   status
-   timeline
-   recipient
-   payment
-   delivery
-   items
-   live tracking flags
-   media availability

------------------------------------------------------------------------

# Complete Shopping Flow

``` text
List Categories
      ↓
Search Products
      ↓
Get Product
      ↓
List Delivery Cities
      ↓
Check Delivery
      ↓
Create Order
      ↓
Customer Pays
      ↓
Receives Order Number
      ↓
Track Order
```

------------------------------------------------------------------------

# Recommended LangGraph Flow

``` text
Supervisor
    │
    ├── Search Agent
    ├── Recommendation Agent
    ├── Delivery Agent
    ├── Checkout Agent
    └── Tracking Agent
```

------------------------------------------------------------------------

# Suggested Python Wrapper

``` python
class KaprukaClient:

    search_products()

    get_product()

    list_categories()

    list_delivery_cities()

    check_delivery()

    create_order()

    track_order()
```

------------------------------------------------------------------------

# Error Handling

Always validate:

-   Missing product IDs
-   Invalid city names
-   Empty search results
-   Out of stock products
-   Delivery unavailable
-   Checkout expiry
-   Invalid order numbers

------------------------------------------------------------------------

# Development Checklist

-   [ ] Connect to MCP
-   [ ] Initialize session
-   [ ] Discover tools
-   [ ] Test category listing
-   [ ] Test search
-   [ ] Test get product
-   [ ] Test cities
-   [ ] Test delivery
-   [ ] Test checkout
-   [ ] Test tracking
-   [ ] Build wrapper class
-   [ ] Integrate with LangGraph
-   [ ] Build FastAPI endpoints
-   [ ] Connect React frontend

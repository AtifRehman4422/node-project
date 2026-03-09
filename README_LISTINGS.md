# Listings API (D:\pr-backend)

## Setup tables (once)

```bash
npm run init-db
npm run init-listings
```

## Tables (PostgreSQL)

| Table | Purpose |
|-------|---------|
| **listings** | Common fields: user_id, property_type, city, address, latitude, longitude, title, description, area_size, rent, available_from, contact_*, status, created_at |
| **listing_images** | Multiple images per listing (listing_id, image_path, sort_order) |
| **hostel_details** | Hostel-specific (beds, room_type, ac, wifi, etc.) |
| **house_details** | House-specific (portion, bhk, floor, furnished, etc.) |
| **flat_details** | Flat-specific |
| **shop_details** | Shop-specific |
| **office_details** | Office-specific |
| **marquee_details** | Marquee/Banquet |
| **guest_house_details** | Guest House |
| **farm_house_details** | Farm House |
| **listing_extras** | laundry, mess, rooms, bathrooms, kitchen, tv_lounge |

Every listing is linked to **user_id** (who created it).

## API

- **POST /api/listings** (auth required, multipart)
  - Headers: `Authorization: Bearer <token>`
  - Body: form-data
    - **images[]** – multiple image files
    - **property_type** – Hostel | House | Flat | Office | Shop | Marquee | Guest House | Farm House
    - **city**, **title** – required
    - **address**, **latitude**, **longitude**, **description**, **area_size**, **area_unit**, **rent**, **is_negotiable**, **available_from**, **available_from_time**, **contact_email**, **contact_phone**, **owner_name**, **whatsapp**, **sector**, **landmark**
    - **laundry**, **mess**, **rooms**, **bathrooms**, **kitchen**, **tv_lounge**
    - **type_details** – JSON string with type-specific fields (e.g. for Hostel: hostel_type, beds, room_type, ac, wifi, …)

- **GET /api/listings** – list all (query: ?city=, ?property_type=, ?user_id=)

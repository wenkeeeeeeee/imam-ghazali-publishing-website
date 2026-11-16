# Imam Ghazali Publishing: five website designs
Each is a working bookstore: 101 titles in RM, a book bag that checks out on imamghazali.my or WhatsApp, free ebooks and classes in KL.

| Variant | What it is | Folder |
|---|---|---|
| V1 · Gilded Edge | A lit atelier room around the Gold Maghazi, walking through how an IGP book is made. | `variants/01-gilded-edge/site/` |
| V2 · The Chain | One book holds the stage while the centuries change, a gold chain from 758 to you in KL. | `variants/02-the-chain/site/` |
| V3 · The Bookshop | Real covers fly into a bright wall of shelves by subject and by Hijri season. | `variants/03-the-bookshop/site/` |
| V4 · Niche of Light | The logo's flame becomes a lamp that lights the leather and gilt covers in the dark. | `variants/04-niche-of-light/site/` |
| V5 · Virtual Bookstore | Walk a bright 3D IGP bookshop, take a book off the shelf and add it to your bag. | `variants/05-virtual-bookstore/site/` |

**Run locally:** `python serve.py . 8080` (or any static server with byte-range support) in this folder, then open http://127.0.0.1:8080/ for the hub page.

Static HTML, CSS and vanilla JS: no build step. `content/` holds the client data, `variants/_shared/` the shared pieces, `docs/` the brief.

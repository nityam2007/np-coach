# NP Coaches — client image requirements

This is the client-ready media specification for the current NP Coaches website. It is based on the image fields, responsive containers, crops, and reuse patterns implemented in the Next.js and Directus code.

The recommended delivery contains **70 core files**. A fully polished pack, including optional content-page banners and testimonial avatars, contains **80 files**.

## 1. Brand and homepage — 13 files

| Section | Filename(s) | Qty | Display ratio | Recommended source size | Notes |
| --- | --- | ---: | ---: | ---: | --- |
| Header logo | `brand-header-logo.png` | 1 | 5:2 | 1500×600 | Transparent PNG. The header also renders “NP Coaches” as text. |
| Homepage hero | `home-hero-coach.jpg` | 1 | 4:3 | 2400×1800 | Keep the main coach centred with clear space around every edge. |
| Service: School Transport | `home-service-school-transport.jpg` | 1 | 8:5 | 1920×1200 | Students and coach; safeguarding-appropriate. |
| Service: Corporate Travel | `home-service-corporate-travel.jpg` | 1 | 8:5 | 1920×1200 | Executive or corporate coach travel. |
| Service: UK Tours | `home-service-uk-tours.jpg` | 1 | 8:5 | 1920×1200 | A recognisable UK destination. |
| Service: Private Hire | `home-service-private-hire.jpg` | 1 | 8:5 | 1920×1200 | Coach at an event, wedding, airport, or group-hire setting. |
| School Transport feature | `home-school-transport.jpg` | 1 | Responsive crop; use a 4:3 master | 2000×1500 | Keep people and coach within the central 50% because the container changes shape. |
| Accreditation logos | See below | 6 | 75:28 | 1200×448 each | Transparent PNG canvas with the official logo centred. |

Accreditation filenames:

- `accreditation-cpt-member.png`
- `accreditation-ukcoa.png`
- `accreditation-coach-tourism-association.png`
- `accreditation-disability-confident.png`
- `accreditation-welove-coaches.png`
- `accreditation-transport-for-buckinghamshire.png`

## 2. Fleet — 44 files

The gallery supports any number of images, but six photographs per vehicle produce a balanced 3×2 gallery. Photograph `01` should be assigned as both the primary image and the first gallery image, so only six unique photographs are required for each vehicle.

| Vehicle | Photographs | Seating plans | Total files |
| --- | ---: | ---: | ---: |
| 19 Seat Mini Coach | 6 | 1 | 7 |
| 35 Seat Midi Coach | 6 | 1 | 7 |
| 53 Seat Executive Coach | 6 | 1 | 7 |
| 72 Seat Coach | 6 | 1 | 7 |
| 86 Seat Double Decker | 6 | 2 | 8 |
| 98 Seat Double Decker | 6 | 2 | 8 |
| **Total** | **36** | **8** | **44** |

For each vehicle, request the following six photographs. Replace `19` with `35`, `53`, `72`, `86`, or `98` for the other vehicles.

- `fleet-19-photo-01-primary.jpg`
- `fleet-19-photo-02-exterior.jpg`
- `fleet-19-photo-03-interior-front.jpg`
- `fleet-19-photo-04-interior-rear.jpg`
- `fleet-19-photo-05-features.jpg`
- `fleet-19-photo-06-luggage-detail.jpg`

Fleet photograph specification:

- Master ratio: **3:2**
- Resolution: **2400×1600**
- Format: high-quality JPG
- Keep the complete coach within the central 70% of the frame.
- Leave generous surroundings and avoid important details near the edges.
- The primary file is displayed at 3:2, 4:3, and as a responsive full-width hero, so centre-safe composition is essential.

Seating-plan filenames:

- `fleet-19-seating-plan.png`
- `fleet-35-seating-plan.png`
- `fleet-53-seating-plan.png`
- `fleet-72-seating-plan.png`
- `fleet-86-seating-plan-lower-deck.png`
- `fleet-86-seating-plan-upper-deck.png`
- `fleet-98-seating-plan-lower-deck.png`
- `fleet-98-seating-plan-upper-deck.png`

Seating-plan specification:

- Ratio: **16:9 canvas**
- Resolution: **2400×1350**
- Format: PNG
- Use a white or transparent background.
- Centre the plan with at least 8% padding.
- All seat numbers and labels must remain readable.

## 3. UK Tours — 7 files

Tour cards and destination detail pages both use a 3:2 crop.

| Filename | Destination | Ratio | Resolution |
| --- | --- | ---: | ---: |
| `tour-london.jpg` | London | 3:2 | 2400×1600 |
| `tour-windsor.jpg` | Windsor | 3:2 | 2400×1600 |
| `tour-hampton-court.jpg` | Hampton Court | 3:2 | 2400×1600 |
| `tour-cornwall.jpg` | Cornwall | 3:2 | 2400×1600 |
| `tour-salisbury.jpg` | Salisbury | 3:2 | 2400×1600 |
| `tour-bath.jpg` | Bath | 3:2 | 2400×1600 |
| `tour-john-wesley-sites.jpg` | John Wesley Methodist Sites | 3:2 | 2400×1600 |

Each destination should receive its own landscape photograph; do not reuse one image for multiple destinations.

## 4. Main content, blog, and school assets — 6 files

| Section | Filename | Qty | Ratio | Resolution | Notes |
| --- | --- | ---: | ---: | ---: | --- |
| About Us | `page-about-us.jpg` | 1 | 4:3 | 2000×1500 | Team, depot, or fleet image. |
| Lost Property | `page-lost-property.jpg` | 1 | 16:9 | 1920×1080 | Coach interior, luggage area, or depot team. |
| Blog: coach size | `blog-choosing-the-right-coach-size.jpg` | 1 | 40:21 | 1200×630 | Also used for social sharing. |
| Blog: ULEZ | `blog-ulez-compliant-coach-hire.jpg` | 1 | 40:21 | 1200×630 | Also used for social sharing. |
| Pioneer school logo | `school-logo-pioneer-secondary-academy.png` | 1 | 1:1 canvas | 800×800 | Transparent PNG, centred without stretching. |
| Herschel school logo | `school-logo-herschel-grammar-school.png` | 1 | 1:1 canvas | 800×800 | Transparent PNG, centred without stretching. |

Blog images appear at both 16:9 and 2:1 on the website. Keep important content within the central 80% of the supplied 1200×630 image.

## 5. Optional content-page banners — 7 files

These CMS image fields are supported by the current generic page template. The pages remain usable without them.

| Filename | Ratio | Resolution |
| --- | ---: | ---: |
| `page-safeguarding.jpg` | 16:7 | 2400×1050 |
| `page-vacancies.jpg` | 16:7 | 2400×1050 |
| `page-downloads.jpg` | 16:7 | 2400×1050 |
| `page-privacy-policy.jpg` | 16:7 | 2400×1050 |
| `page-cookie-policy.jpg` | 16:7 | 2400×1050 |
| `page-timetable.jpg` | 16:7 | 2400×1050 |
| `page-terms-and-conditions.jpg` | 16:7 | 2400×1050 |

Do not request an FAQ banner: the dedicated FAQ page does not currently render its CMS image field.

## 6. Optional testimonial avatars — 3 files

- `testimonial-head-of-trips.jpg`
- `testimonial-operations-manager.jpg`
- `testimonial-wedding-organiser.jpg`

Supply these at **1:1, 800×800**, with the face centred. They render as 48×48 circular avatars. The existing initials fallback works when no photograph is supplied.

## Delivery requirements

- Photos: JPG, sRGB, quality 85–90%, preferably no more than 5 MB each.
- Transparent assets: PNG.
- Supply original vector logo and accreditation artwork separately for archival use, plus the specified PNG web exports.
- Do not send HEIC files, screenshots, WhatsApp-compressed images, or images embedded inside Word/PDF documents.
- Do not bake text, borders, or watermarks into photographs.
- Use landscape orientation unless a square canvas is explicitly specified.
- Preserve the original files even after creating the web exports.
- Do not create separate desktop and mobile files: the current code uses one responsive master per CMS image field.

## Current asset replacement priorities

The most urgent replacements identified in the existing media archive are:

1. The homepage hero is portrait **2076×2595**, while the website displays it at **4:3**.
2. The Lost Property image is only **225×225**, while the website displays it at **16:9**.
3. Fleet primary images are mostly only **1024 px wide**, even though they also serve as full-width detail-page heroes.
4. Several accreditation logos are only **164–500 px wide** and use inconsistent canvases.
5. The current “choosing the right coach size” blog image is portrait but is displayed at approximately 2:1.
6. Several tour destinations currently reuse the same image.
7. Most existing fleet gallery photographs are already suitable at approximately **2560×1707** and can remain until approved replacements arrive.

## Implementation note

Directus generates responsive image widths and the Next.js components provide browser `sizes`, so the client only needs to supply one high-resolution master for each file listed above. Most photographic containers use `object-cover`, which crops the source to the displayed ratio. Logos and seating plans use `object-contain` and are not cropped.

Directus currently does not enforce minimum dimensions or aspect ratios when an editor uploads a replacement. These requirements therefore need to be followed during asset preparation and CMS upload.

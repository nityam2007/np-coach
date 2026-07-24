Recommended Stack (Final)

Frontend

Next.js 16

Tailwind CSS

TypeScript


Database

MariaDB

Prisma ORM - do not use with directus -- if directus is there do not use it at all -- no use in project 


CMS / Admin

Directus


Directus manages:

Blog

Pages

SEO

Fleet

Tours

Contact submissions

Ticket bookings

Pass bookings


Payments

Stripe


Handles:

Ticket Booking Payments

Pass Purchase Payments


Email

Microsoft 365 SMTP


Since they already pay for Microsoft 365:

booking confirmations

pass receipts

contact form notifications

quote requests


No need for Resend.

Hosting

Existing VPS

Docker

Traefik





--

Features

Website

Existing Pages

Blog

Fleet

Tours

Contact

SEO


Ticket Booking

Route Selection

Date Selection

Passenger Details

Stripe Payment

Email Confirmation


Pass Booking

Pass Purchase Form

Stripe Payment

Email Receipt


School Bus Booking

External Portal Link or

Iframe


Contact Forms

Contact

Quote Request



---

Stack Summary

Next.js 16
Tailwind CSS
TypeScript

Directus
MariaDB
Prisma - avoid if direcctus can handle it 

Stripe
Microsoft 365 SMTP

Docker
Traefik
VPS

Why This

Fully owned

Self-hosted

No WordPress

No Sanity dependency

No Supabase cost

No Vercel dependency

Client gets admin panel

Low maintenance

Easy backups

Single database

Scales well for bookings + content + payments
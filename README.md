# Referral Code & Voucher Sharing App

A simple web application to discover, submit, and manage referral codes and discount vouchers. Built with Next.js and Supabase, it is designed to be mobile-friendly and easy to maintain.

## What I Learned

While building this project, I gained experience with:

- Implementing fuzzy search using Supabase RPC functions
- Managing structured data in Supabase (services, codes, feedback)
- Building a basic admin panel with basic authentication
- Creating feedback logic that disables codes after multiple failure reports
- Using the Clipboard API to let users copy code easily
- Writing UI logic for retrying codes, handling copy state, and tracking feedback
- Displaying lightweight usage statistics in the frontend

## Features

### Public (User-Facing)

- Search and Suggest  
  Fuzzy match service names like "b o0king" → "Booking.com"  
  Only services with active codes are shown

- Get Referral Code  
  Displays one random code per search  
  Retry to get another if available

- Submit Feedback  
  Users can report whether a code worked or not  
  Failed codes are marked with reasons (e.g. expired, used)

- Code Copying  
  Copy referral code or link to the clipboard  
  Copy count is stored in the database

- Explore Top Services  
  Shows a list of services with the most referral codes

- Code Metadata  
  View when the code was added and how many users reported it working or not

### Admin Panel

- Password-protected route
- View all submitted codes
- View inactive codes and reasons for deactivation
- Manually delete or reactivate any code
- Simple backend-only moderation interface

## Getting Started

Install dependencies:

npm install

Start the development server:

npm run dev

Visit: http://localhost:3000

## Tech Stack

- Next.js (App Router)
- Supabase (PostgreSQL)
- Tailwind CSS
- No authentication required for public features

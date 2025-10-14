     1	# Deployment Guide
     2	
     3	## Quick Reference
     4	
     5	### Fast Deployment (Recommended for Testing)
     6	```bash
     7	npm run deploy
     8	```
     9	Builds locally and uploads to Vercel. **~30 seconds**.
    10	
    11	### Full Deployment Scripts
    12	
    13	```bash
    14	# Fast: Local build + upload (includes all setup steps)
    15	npm run deploy:local
    16	
    17	# Safe: Remote build on Vercel (includes all setup steps)  
    18	npm run deploy:remote
    19	
    20	# Default: Same as deploy:remote
    21	npm run deploy:prod
    22	```
    23	
    24	---
    25	
    26	## Deployment Options Compared
    27	
    28	| Command | Build Location | Speed | Use Case |
    29	|---------|---------------|-------|----------|
    30	| `npm run deploy` | Local | ⚡ ~30s | Quick deploys, testing |
    31	| `npm run deploy:local` | Local | ⚡ ~30s | Full deployment with env setup |
    32	| `npm run deploy:remote` | Vercel | 🐢 ~2-3min | Production releases, CI/CD |
    33	| `npm run deploy:prod` | Vercel | 🐢 ~2-3min | Same as remote (default) |
    34	
    35	---
    36	
    37	## Detailed Breakdown
    38	
    39	### `npm run deploy` (Fastest)
    40	**What it does:**
    41	1. Runs `npm run build` locally
    42	2. Uploads built files with `vercel deploy --prebuilt --prod`
    43	
    44	**When to use:**
    45	- Quick iterations
    46	- Testing production builds
    47	- You've already set up environment variables
    48	
    49	**When NOT to use:**
    50	- First deployment (use `deploy:local` or `deploy:remote` instead)
    51	- Environment variables changed (use full script)
    52	
    53	**Requirements:**
    54	- `.vercel` directory configured (run `vercel link` first, or use full script once)
    55	- Environment variables already set in Vercel
    56	- Local `.env.local` file present
    57	
    58	---
    59	
    60	### `npm run deploy:local` (Fast + Complete)
    61	**What it does:**
    62	1. Deploys Convex functions to production
    63	2. Sets up/updates all Vercel environment variables
    64	3. Configures production URLs
    65	4. Builds locally
    66	5. Uploads to Vercel
    67	
    68	**When to use:**
    69	- First time deploying
    70	- Environment variables changed
    71	- Quick deployments with full setup
    72	- Testing production configuration
    73	
    74	**Speed:** ~1-2 minutes (most time spent on env setup)
    75	
    76	---
    77	
    78	### `npm run deploy:remote` (Safest)
    79	**What it does:**
    80	1. Deploys Convex functions to production
    81	2. Sets up/updates all Vercel environment variables
    82	3. Configures production URLs
    83	4. **Vercel builds your app** (reproducible)
    84	5. Deploys to production
    85	
    86	**When to use:**
    87	- Production releases
    88	- CI/CD pipelines
    89	- Team deployments
    90	- Need guaranteed reproducibility
    91	
    92	**Speed:** ~2-3 minutes (Vercel build time)
    93	
    94	---
    95	
    96	## Environment Variables
    97	
    98	### Local Build (`npm run deploy`, `deploy:local`)
    99	Uses your local `.env.local` file during build:
   100	```bash
   101	# .env.local is read during npm run build
   102	NEXT_PUBLIC_CONVEX_URL=...
   103	AUTH_SECRET=...
   104	GOOGLE_CLIENT_ID=...
   105	```
   106	
   107	### Remote Build (`deploy:remote`, `deploy:prod`)
   108	Uses Vercel environment variables during build:
   109	- Set via the deployment script
   110	- Stored in Vercel dashboard
   111	- More secure for teams
   112	
   113	---
   114	
   115	## First Time Setup
   116	
   117	**Option 1: Fast track (if you know your env vars are set)**
   118	```bash
   119	npm run deploy
   120	```
   121	
   122	**Option 2: Complete setup (recommended)**
   123	```bash
   124	npm run deploy:local
   125	# or
   126	npm run deploy:remote
   127	```
   128	
   129	The full scripts will:
   130	- ✅ Deploy Convex to production
   131	- ✅ Prompt for CONVEX_ADMIN_KEY if missing
   132	- ✅ Set all environment variables in Vercel
   133	- ✅ Configure production URLs automatically
   134	- ✅ Show post-deployment instructions
   135	
   136	---
   137	
   138	## Troubleshooting
   139	
   140	### "Error: No existing project found"
   141	Run once with the full script:
   142	```bash
   143	npm run deploy:local
   144	```
   145	
   146	### "Environment variable not found during build"
   147	Make sure your `.env.local` has all required variables:
   148	```bash
   149	AUTH_SECRET=...
   150	GOOGLE_CLIENT_ID=...
   151	GOOGLE_CLIENT_SECRET=...
   152	NEXT_PUBLIC_CONVEX_URL=...
   153	CONVEX_ADMIN_KEY=...
   154	```
   155	
   156	### Build fails locally
   157	Check that dependencies are installed:
   158	```bash
   159	npm install
   160	npm run build  # Test local build
   161	```
   162	
   163	---
   164	
   165	## Pro Tips
   166	
   167	💡 **For rapid iteration:**
   168	```bash
   169	npm run deploy
   170	```
   171	
   172	💡 **For production releases:**
   173	```bash
   174	npm run deploy:remote
   175	```
   176	
   177	💡 **After changing env vars:**
   178	```bash
   179	npm run deploy:local  # or deploy:remote
   180	```
   181	
   182	💡 **For CI/CD pipelines:**
   183	```bash
   184	npm run deploy:remote
   185	```

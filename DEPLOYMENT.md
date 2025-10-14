     1	# Deployment Guide
     2	
     3	## ⚠️ IMPORTANT: First Time Setup
     4	
     5	**Before using `npm run deploy`**, you MUST run the full script once:
     6	
     7	```bash
     8	npm run deploy:local
     9	# or
    10	npm run deploy:remote
    11	```
    12	
    13	This sets up your Vercel project and links it locally. After that, you can use the fast `npm run deploy` command.
    14	
    15	---
    16	
    17	## Quick Reference
    18	
    19	### Fast Deployment (After Initial Setup)
    20	```bash
    21	npm run deploy
    22	```
    23	Builds locally and uploads to Vercel. **~30 seconds**.
    24	
    25	### Full Deployment Scripts
    26	
    27	```bash
    28	# Fast: Local build + upload (includes all setup steps)
    29	npm run deploy:local
    30	
    31	# Safe: Remote build on Vercel (includes all setup steps)  
    32	npm run deploy:remote
    33	
    34	# Default: Same as deploy:remote
    35	npm run deploy:prod
    36	```
    37	
    38	---
    39	
    40	## Deployment Options Compared
    41	
    42	| Command | Build Location | Speed | Use Case |
    43	|---------|---------------|-------|----------|
    44	| `npm run deploy` | Local | ⚡ ~30s | Quick deploys, testing |
    45	| `npm run deploy:local` | Local | ⚡ ~30s | Full deployment with env setup |
    46	| `npm run deploy:remote` | Vercel | 🐢 ~2-3min | Production releases, CI/CD |
    47	| `npm run deploy:prod` | Vercel | 🐢 ~2-3min | Same as remote (default) |
    48	
    49	---
    50	
    51	## Detailed Breakdown
    52	
    53	### `npm run deploy` (Fastest)
    54	**What it does:**
    55	1. Runs `vercel build` locally (creates .vercel/output)
    56	2. Uploads built files with `vercel deploy --prebuilt --prod`
    57	
    58	**When to use:**
    59	- Quick iterations
    60	- Testing production builds
    61	- You've already set up environment variables
    62	
    63	**When NOT to use:**
    64	- **First deployment** (use `deploy:local` or `deploy:remote` instead)
    65	- Environment variables changed (use full script)
    66	
    67	**Requirements:**
    68	- `.vercel` directory configured (run full script once first)
    69	- Environment variables already set in Vercel
    70	- Local `.env.local` file present
    71	
    72	---
    73	
    74	### `npm run deploy:local` (Fast + Complete)
    75	**What it does:**
    76	1. Deploys Convex functions to production
    77	2. Sets up/updates all Vercel environment variables
    78	3. Configures production URLs
    79	4. Builds locally with `vercel build`
    80	5. Uploads to Vercel
    81	
    82	**When to use:**
    83	- **First time deploying**
    84	- Environment variables changed
    85	- Quick deployments with full setup
    86	- Testing production configuration
    87	
    88	**Speed:** ~1-2 minutes (most time spent on env setup)
    89	
    90	---
    91	
    92	### `npm run deploy:remote` (Safest)
    93	**What it does:**
    94	1. Deploys Convex functions to production
    95	2. Sets up/updates all Vercel environment variables
    96	3. Configures production URLs
    97	4. **Vercel builds your app** (reproducible)
    98	5. Deploys to production
    99	
   100	**When to use:**
   101	- Production releases
   102	- CI/CD pipelines
   103	- Team deployments
   104	- Need guaranteed reproducibility
   105	
   106	**Speed:** ~2-3 minutes (Vercel build time)
   107	
   108	---
   109	
   110	## Environment Variables
   111	
   112	### Local Build (`npm run deploy`, `deploy:local`)
   113	Uses your local `.env.local` file during build:
   114	```bash
   115	# .env.local is read during build
   116	NEXT_PUBLIC_CONVEX_URL=...
   117	AUTH_SECRET=...
   118	GOOGLE_CLIENT_ID=...
   119	```
   120	
   121	### Remote Build (`deploy:remote`, `deploy:prod`)
   122	Uses Vercel environment variables during build:
   123	- Set via the deployment script
   124	- Stored in Vercel dashboard
   125	- More secure for teams
   126	
   127	---
   128	
   129	## First Time Setup
   130	
   131	**Recommended approach:**
   132	```bash
   133	npm run deploy:local
   134	# or
   135	npm run deploy:remote
   136	```
   137	
   138	The full scripts will:
   139	- ✅ Deploy Convex to production
   140	- ✅ Prompt for CONVEX_ADMIN_KEY if missing
   141	- ✅ Set all environment variables in Vercel
   142	- ✅ Configure production URLs automatically
   143	- ✅ **Link your project locally**
   144	- ✅ Show post-deployment instructions
   145	
   146	After running once, you can use `npm run deploy` for fast deployments.
   147	
   148	---
   149	
   150	## Troubleshooting
   151	
   152	### "No Project Settings found locally"
   153	This means you haven't linked your project yet. Run the full script:
   154	```bash
   155	npm run deploy:local
   156	```
   157	This will link your project and set everything up.
   158	
   159	### "Error: No existing project found"
   160	Same as above - run the full script once:
   161	```bash
   162	npm run deploy:local
   163	```
   164	
   165	### "Environment variable not found during build"
   166	Make sure your `.env.local` has all required variables:
   167	```bash
   168	AUTH_SECRET=...
   169	GOOGLE_CLIENT_ID=...
   170	GOOGLE_CLIENT_SECRET=...
   171	NEXT_PUBLIC_CONVEX_URL=...
   172	CONVEX_ADMIN_KEY=...
   173	```
   174	
   175	### Build fails locally
   176	Check that dependencies are installed:
   177	```bash
   178	npm install
   179	vercel build  # Test local build
   180	```
   181	
   182	---
   183	
   184	## Pro Tips
   185	
   186	💡 **For rapid iteration (after first deploy):**
   187	```bash
   188	npm run deploy
   189	```
   190	
   191	💡 **For first time or major changes:**
   192	```bash
   193	npm run deploy:local
   194	```
   195	
   196	💡 **For production releases:**
   197	```bash
   198	npm run deploy:remote
   199	```
   200	
   201	💡 **After changing env vars:**
   202	```bash
   203	npm run deploy:local  # or deploy:remote
   204	```
   205	
   206	💡 **For CI/CD pipelines:**
   207	```bash
   208	npm run deploy:remote
   209	```

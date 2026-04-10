# Masters Tracker

## Local run

1. In PowerShell:

```powershell
$env:GOLF_RAPIDAPI_KEY="YOUR_RAPIDAPI_KEY"
npm start
```

2. Open:

`http://127.0.0.1:3000/`

## Render deploy

1. Put this folder in a GitHub repo.
2. In Render, create a new Blueprint service from that repo, or create a Node web service manually.
3. Set the `GOLF_RAPIDAPI_KEY` environment variable in Render.
4. Deploy and open the Render URL.

The app serves the page at `/` and proxies the Masters RapidAPI request at `/api/masters`.

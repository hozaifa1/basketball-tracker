# Basketball Tracker

A Next.js + Django application for tracking basketball team attendance and finances.

## Deployment to Vercel

This project is configured for deployment on Vercel.

1.  **Push to GitHub:** Ensure this code is in a GitHub repository.
2.  **Import to Vercel:**
    *   Go to Vercel Dashboard -> Add New -> Project.
    *   Select your repository.
3.  **Configuration:**
    *   Vercel should automatically detect the `vercel.json` configuration.
    *   It will build the Frontend (Next.js) and the Backend (Python/Django) as Serverless functions.
4.  **Environment Variables:**
    *   Add `SECRET_KEY` for Django.
    *   Add `DEBUG` (set to `False` for production).
    *   Set `NEXT_PUBLIC_API_URL` to `/api` (optional, as it defaults to this).

## Local Development

1.  **Backend:**
    ```bash
    pip install -r requirements.txt
    python manage.py runserver
    ```
2.  **Frontend:**
    ```bash
    cd frontend
    npm install
    npm run dev
    ```

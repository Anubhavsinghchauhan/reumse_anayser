import os

from fastapi import FastAPI

from fastapi.middleware.cors import CORSMiddleware

from pydantic import BaseModel

from fastapi.staticfiles import StaticFiles


from embedd import load_resume_embeddings, rank_resumes, analyze_top_candidates
 
app = FastAPI(title="Resume–Job Matching API", version="1.0")
 
# Enable CORS for frontend access

app.add_middleware(

    CORSMiddleware,

    allow_origins=["*"],

    allow_credentials=True,

    allow_methods=["*"],

    allow_headers=["*"],

)

app.mount("/resumes", StaticFiles(directory="resumes"), name="resumes")
 
class JobDescription(BaseModel):

    description: str

    include_analysis: bool = True

    num_candidates: int = 5  # default top 5
 
 
print("🔄 Loading or creating resume embeddings...")

resume_embeddings = load_resume_embeddings()

print("✅ Resume embeddings ready.")
 
 
@app.post("/match")

def match_job(job: JobDescription):

    ranked = rank_resumes(job.description, resume_embeddings)

    top_n = job.num_candidates

    top_candidates = ranked[:top_n]
 
    response = {

        "ranked_candidates": ranked,

        "shown_top": top_n

    }
 
    if job.include_analysis:

        analyses = analyze_top_candidates(

            job.description,

            [r["file_name"] for r in top_candidates]

        )

        response["analysis"] = analyses
 
    return response
 
 
@app.get("/")

def home():

    return {"message": "Resume–Job Matching API is running 🚀"}
 
 
if __name__ == "__main__":

    import uvicorn


    port = int(os.getenv("PORT", 5000))

    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)




 
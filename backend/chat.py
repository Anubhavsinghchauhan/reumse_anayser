# =====================================================
# 🧠 Resume–Job Description Analyzer (ChatGPT Embeddings)
# =====================================================

import os
import glob
import json
import numpy as np
from tqdm import tqdm
from dotenv import load_dotenv
from openai import OpenAI
from sklearn.metrics.pairwise import cosine_similarity
from langchain_community.document_loaders import PyMuPDFLoader, PyPDFLoader

# =====================================================
# 🔑 Setup
# =====================================================
load_dotenv()
RESUME_FOLDER = "resumes"
EMBED_CACHE = "resume_embeddings_openai.json"
os.makedirs(RESUME_FOLDER, exist_ok=True)

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
EMBED_MODEL = "text-embedding-3-large"

def get_vector(text):
    """Get embedding vector from OpenAI"""
    text = text.replace("\n", " ")
    resp = client.embeddings.create(model=EMBED_MODEL, input=text)
    return resp.data[0].embedding

# =====================================================
# 📦 Load cached embeddings
# =====================================================
if os.path.exists(EMBED_CACHE):
    with open(EMBED_CACHE, "r", encoding="utf-8") as f:
        cached_data = json.load(f)
else:
    cached_data = {}

# =====================================================
# 📂 Load resumes and embed new ones
# =====================================================
resume_files = glob.glob(f"{RESUME_FOLDER}/*.pdf")
resume_embeddings = {}

print("\n📄 Loading and embedding resumes...")
for file_path in tqdm(resume_files):
    file_name = os.path.basename(file_path)

    if file_name in cached_data:
        resume_embeddings[file_name] = np.array(cached_data[file_name])
        continue

    try:
        loader = PyMuPDFLoader(file_path)
        docs = loader.load()
        text = " ".join([d.page_content for d in docs])
    except Exception:
        loader = PyPDFLoader(file_path)
        docs = loader.load()
        text = " ".join([d.page_content for d in docs])

    text = text[:12000]
    vector = get_vector(text)
    resume_embeddings[file_name] = np.array(vector)

# Save cache
with open(EMBED_CACHE, "w", encoding="utf-8") as f:
    json.dump({k: v.tolist() for k, v in resume_embeddings.items()}, f, indent=2)

print(f"\n✅ Cached embeddings saved to '{EMBED_CACHE}'")

# =====================================================
# 💼 Job Description Input
# =====================================================
print("\nEnter or paste the job description (press Enter twice):")
lines = []
while True:
    line = input()
    if line.strip() == "":
        break
    lines.append(line)
job_description = "\n".join(lines).strip()

job_vec = np.array(get_vector(job_description)).reshape(1, -1)

# =====================================================
# 🔍 Calculate cosine similarity
# =====================================================
results = []
for file_name, vec in resume_embeddings.items():
    sim = cosine_similarity(job_vec, vec.reshape(1, -1))[0][0]
    results.append({
        "file_name": file_name,
        "similarity_score": round(float(sim), 3)
    })

sorted_results = sorted(results, key=lambda x: x["similarity_score"], reverse=True)

# =====================================================
# 🧩 Rank and Show Results
# =====================================================
print("\n===============================================")
print("🏆 RANKED CANDIDATES (ChatGPT Embeddings)")
print("===============================================")
for i, r in enumerate(sorted_results, start=1):
    emoji = (
        "🟢" if r["similarity_score"] >= 0.75 else
        "🟡" if r["similarity_score"] >= 0.55 else
        "🟠" if r["similarity_score"] > 0.35 else
        "🔴"
    )
    print(f"{i:02d}. {emoji} {r['file_name']:<25} — Score: {r['similarity_score']:.3f}")

# =====================================================
# 🧾 Optional: Deeper Analysis using ChatGPT
# =====================================================
top_3 = [r["file_name"] for r in sorted_results[:3]]

print("\n🤖 Generating short analysis for top candidates...\n")
for name in top_3:
    resume_path = os.path.join(RESUME_FOLDER, name)
    try:
        loader = PyMuPDFLoader(resume_path)
        docs = loader.load()
        resume_text = " ".join([d.page_content for d in docs])[:4000]
    except Exception:
        loader = PyPDFLoader(resume_path)
        docs = loader.load()
        resume_text = " ".join([d.page_content for d in docs])[:4000]

    prompt = f"""
    You are an expert recruiter. Given the following job description and candidate resume,
    briefly assess how well the candidate fits the job (skills, experience, match gaps).
    
    JOB DESCRIPTION:
    {job_description}
    
    RESUME:
    {resume_text}
    
    Provide a short summary (max 50 words) and rating out of 10.
    """

    chat_resp = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[{"role": "user", "content": prompt}],
        temperature=0.3,
    )

    analysis = chat_resp.choices[0].message.content
    print(f"📄 {name}\n{analysis}\n{'-'*70}")

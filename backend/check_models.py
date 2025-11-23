import google.generativeai as genai
import os
from dotenv import load_dotenv

# Muat API Key dari file .env
load_dotenv()
api_key = os.getenv("GEMINI_API_KEY")

if not api_key:
    print("❌ Error: API Key tidak ditemukan di file .env")
    print("Pastikan kamu menjalankan script ini dari folder yang punya file .env")
else:
    print(f"✅ API Key ditemukan. Sedang menghubungi Google...")
    genai.configure(api_key=api_key)

    try:
        print("\nDaftar Model yang Mendukung 'generateContent':")
        print("---------------------------------------------")
        
        # Ambil daftar model
        models = genai.list_models()
        found = False
        
        for m in models:
            if 'generateContent' in m.supported_generation_methods:
                print(f"- {m.name}")
                found = True
        
        if not found:
            print("Tidak ada model yang ditemukan (Cek koneksi/API Key).")
            
    except Exception as e:
        print(f"\n❌ Terjadi Kesalahan: {e}")
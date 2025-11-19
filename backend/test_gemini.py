# test_gemini.py
import os
import google.generativeai as genai
from dotenv import load_dotenv

# Muat variabel dari file .env
load_dotenv() 

# Ambil API Key dari environment variable
api_key = os.getenv("GEMINI_API_KEY")

if not api_key:
    print("ERROR: GEMINI_API_KEY tidak ditemukan di file .env")
else:
    try:
        print("INFO: Mengkonfigurasi API Key...")
        genai.configure(api_key=api_key)
        print("INFO: Konfigurasi berhasil.")

        # --- COBA PANGGIL MODEL ---
        model_name_to_test = 'gemini-pro' # Gunakan model paling dasar dulu
        print(f"INFO: Mencoba membuat model: {model_name_to_test}...")
        model = genai.GenerativeModel(model_name_to_test)
        print(f"INFO: Berhasil membuat instance model {model_name_to_test}.")

        # --- COBA PANGGIL generate_content ---
        prompt_text = "Tulis puisi singkat tentang Jakarta."
        print(f"INFO: Mencoba generate_content dengan prompt: '{prompt_text}'...")

        # Panggil generate_content (bukan async untuk tes sederhana ini)
        # Minta respons sebagai teks biasa dulu, bukan JSON
        response = model.generate_content(prompt_text) 

        print("\n--- HASIL DARI GEMINI ---")
        print(response.text)
        print("-------------------------\n")
        print("INFO: Tes pemanggilan API Gemini BERHASIL!")

    except Exception as e:
        print(f"\nERROR saat tes pemanggilan API Gemini: {type(e).__name__} - {e}")
        # Coba cetak detail error jika ada dari Gemini API
        if hasattr(e, 'response') and hasattr(e.response, 'prompt_feedback'):
             print(f"      Prompt Feedback: {e.response.prompt_feedback}")
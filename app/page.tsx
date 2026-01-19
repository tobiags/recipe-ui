"use client";

import { useState, FormEvent } from "react";
import { Loader2, Download, AlertCircle, FileText, Images, Mail, Rocket } from "lucide-react";

// --- TYPES ---
type ApiRequest = {
  topic: string;
  recipe_count: number;
  image_count: number;
  image_engine: "midjourney" | "flux_replicate" | "flux_pro";
  style_ref_url: string | null;
  prompt_override: string | null;
  output: {
    aspect_ratio: string;
    image_format: string;
  };
  client: {
    email: string | null;
  };
};

type ApiResponse = {
  request_id: string;
  status: "done" | "error" | "started";
  topic?: string;
  message?: string;
  files?: {
    article: { name: string; download_url: string };
    album_zip: { name: string; download_url: string };
  };
  error?: { code: string; message: string };
};

export default function Home() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ApiResponse | null>(null);

  // Valeurs par défaut
  const [formData, setFormData] = useState<ApiRequest>({
    topic: "15 recettes de plats mijotés d'hiver",
    recipe_count: 15,
    image_count: 15,
    image_engine: "flux_replicate",
    style_ref_url: "",
    prompt_override: "",
    output: { aspect_ratio: "3:2", image_format: "jpg" },
    client: { email: "" },
  });

  // --- HELPERS ---
  const updateField = (field: keyof ApiRequest, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const updateNested = (parent: "output" | "client", field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [parent]: { ...prev[parent], [field]: value },
    }));
  };

  // --- SOUMISSION ---
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    // Validation Email Stricte
    if (!formData.client.email?.trim() || !formData.client.email.includes("@")) {
      setError("Une adresse email valide est obligatoire pour recevoir les fichiers.");
      return;
    }

    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const payload: ApiRequest = {
        ...formData,
        style_ref_url: formData.style_ref_url?.trim() || null,
        prompt_override: formData.prompt_override?.trim() || null,
        client: { email: formData.client.email.trim() },
      };

      const endpoint = `${process.env.NEXT_PUBLIC_N8N_API_URL}/webhook/v1/generate`;
      
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        const text = await response.text();
        throw new Error(`Erreur serveur (${response.status}). Vérifiez n8n.`);
      }

      const data: ApiResponse = await response.json();

      if (data.status === "error") {
        throw new Error(data.error?.message || "Erreur inconnue du générateur");
      }

      setResult(data);

    } catch (err: any) {
      setError(err.message || "Une erreur est survenue.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#FDF8F6] p-6 md:p-12 font-sans text-neutral-900">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* HEADER */}
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight mb-2 text-neutral-800">
            Console Recettes <span className="text-orange-600">v2</span>
          </h1>
          <p className="text-neutral-500">
            Générateur asynchrone : lancez de gros volumes (15-30 recettes) et recevez les fichiers par email.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* COLONNE GAUCHE : FORMULAIRE */}
          <div className="lg:col-span-2 bg-white p-8 rounded-2xl shadow-sm border border-neutral-200">
            <form onSubmit={handleSubmit} className="space-y-6">
              
              {/* Sujet */}
              <div>
                <label className="block text-sm font-bold mb-2 text-neutral-700">Sujet des recettes</label>
                <textarea
                  required
                  rows={2}
                  className="w-full p-3 border rounded-lg bg-neutral-50 focus:ring-2 focus:ring-orange-500 outline-none transition"
                  value={formData.topic}
                  onChange={(e) => updateField("topic", e.target.value)}
                />
              </div>

              {/* Email (Mis en avant car critique) */}
              <div className="bg-orange-50 p-4 rounded-lg border border-orange-100">
                <label className="block text-sm font-bold mb-2 text-orange-900 flex items-center">
                  <Mail className="w-4 h-4 mr-2" /> Email de livraison (Obligatoire)
                </label>
                <input
                  type="email"
                  required
                  placeholder="client@exemple.com"
                  className="w-full p-3 border border-orange-200 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                  value={formData.client.email || ""}
                  onChange={(e) => updateNested("client", "email", e.target.value)}
                />
                <p className="text-xs text-orange-700 mt-2">
                  Les liens de téléchargement (Article + Images) seront envoyés à cette adresse.
                </p>
              </div>

              {/* Counts */}
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium mb-1">Nombre de recettes</label>
                  <input
                    type="number"
                    min={1}
                    max={50}
                    className="w-full p-3 border rounded-lg"
                    value={formData.recipe_count}
                    onChange={(e) => updateField("recipe_count", parseInt(e.target.value))}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Nombre d'images</label>
                  <input
                    type="number"
                    min={0}
                    max={50}
                    className="w-full p-3 border rounded-lg"
                    value={formData.image_count}
                    onChange={(e) => updateField("image_count", parseInt(e.target.value))}
                  />
                </div>
              </div>

              {/* Action */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-neutral-900 hover:bg-neutral-800 text-white font-bold py-4 px-6 rounded-xl shadow-lg transition-all flex items-center justify-center disabled:opacity-70 disabled:cursor-not-allowed mt-4"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="animate-spin mr-2 h-5 w-5" />
                    Lancement en cours...
                  </>
                ) : (
                  <>
                    <Rocket className="mr-2 h-5 w-5" /> Lancer la génération
                  </>
                )}
              </button>
            </form>
          </div>

          {/* COLONNE DROITE : STATUT */}
          <div className="h-fit space-y-6">
            
            {/* Gestion des erreurs */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm flex items-start animate-in fade-in slide-in-from-top-2">
                <AlertCircle className="h-5 w-5 mr-2 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">Erreur</p>
                  <p>{error}</p>
                </div>
              </div>
            )}

            {/* Succès Async (Le nouveau standard) */}
            {result?.status === "started" && (
              <div className="bg-green-50 border border-green-200 rounded-2xl p-6 text-center shadow-sm animate-in zoom-in-95 duration-300">
                <div className="mx-auto bg-green-100 w-16 h-16 rounded-full flex items-center justify-center mb-4 shadow-inner">
                  <Rocket className="h-8 w-8 text-green-600" />
                </div>
                <h3 className="text-xl font-bold text-green-900 mb-2">C'est parti !</h3>
                <p className="text-green-800 mb-4">
                  La génération de vos recettes a démarré sur le serveur.
                </p>
                
                <div className="bg-white/60 rounded-lg p-3 text-sm text-left border border-green-100">
                  <p className="flex items-center text-green-700 mb-1">
                    <Mail className="w-4 h-4 mr-2" /> 
                    Destinataire : <span className="font-semibold ml-1">{formData.client.email}</span>
                  </p>
                  <p className="text-green-600 text-xs ml-6">
                    Vous recevrez un email avec le ZIP et l'Article dès que le traitement est terminé (env. 20-30 min).
                  </p>
                </div>
                
                <p className="mt-6 text-xs text-green-500 font-medium">
                  Vous pouvez fermer cette page sans risque.
                </p>
              </div>
            )}

            {/* État vide */}
            {!result && !isLoading && !error && (
              <div className="bg-white p-6 rounded-2xl border border-neutral-200 text-center text-neutral-400 py-12 border-dashed">
                <div className="mx-auto bg-neutral-50 w-12 h-12 rounded-full flex items-center justify-center mb-3">
                  <FileText className="h-6 w-6 text-neutral-300" />
                </div>
                <p className="text-sm">Le statut de la commande s'affichera ici.</p>
              </div>
            )}

          </div>
        </div>
      </div>
    </main>
  );
}

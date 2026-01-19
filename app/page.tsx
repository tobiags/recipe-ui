"use client";

import { useState } from "react";
import { Loader2, AlertCircle, Mail, Rocket, FileText } from "lucide-react";

// --- TYPES ---
type ApiRequest = {
  topic: string;
  recipe_count: number;
  image_count: number;
  image_engine: "midjourney" | "flux_replicate" | "flux_pro";
  style_ref_url: string;
  prompt_override: string;
  output: {
    aspect_ratio: string;
    image_format: string;
  };
  client: {
    email: string;
  };
};

type ApiResponse = {
  request_id: string;
  status: "done" | "error" | "started";
  topic?: string;
  message?: string;
};

const API_URL = process.env.NEXT_PUBLIC_N8N_API_URL || "https://n8n.144.91.72.28.nip.io";

export default function Home() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ApiResponse | null>(null);

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

  const updateField = <K extends keyof ApiRequest>(field: K, value: ApiRequest[K]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const updateNested = (parent: "output" | "client", field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [parent]: { ...prev[parent], [field]: value },
    }));
  };

  const handleSubmit = async () => {
    // Validation de l'email
    if (!formData.client.email?.trim()) {
      setError("L'email est obligatoire pour la livraison asynchrone.");
      return;
    }

    // Validation des nombres
    if (formData.recipe_count < 1 || formData.image_count < 1) {
      setError("Le nombre de recettes et d'images doit être supérieur à 0.");
      return;
    }

    if (isNaN(formData.recipe_count) || isNaN(formData.image_count)) {
      setError("Veuillez entrer des nombres valides.");
      return;
    }

    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const payload = {
        ...formData,
        style_ref_url: formData.style_ref_url?.trim() || null,
        prompt_override: formData.prompt_override?.trim() || null,
        client: { email: formData.client.email.trim() },
      };

      const response = await fetch(`${API_URL}/webhook/v1/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      // Vérification du statut HTTP
      if (!response.ok) {
        throw new Error(`Erreur HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.status === "error") {
        throw new Error(data.error?.message || data.message || "Erreur serveur");
      }
      
      setResult(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Une erreur est survenue.";
      setError(errorMessage);
      console.error("Erreur de génération:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleNumberChange = (field: "recipe_count" | "image_count", value: string) => {
    const num = parseInt(value, 10);
    if (!isNaN(num) && num >= 0) {
      updateField(field, num);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-orange-50 to-pink-50 p-4 md:p-12 font-sans text-neutral-900">
      <div className="max-w-5xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-neutral-800">
            Console Recettes <span className="text-orange-600">PRO</span>
          </h1>
          <p className="text-neutral-500">Configuration complète pour générations massives par email.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            {/* Section Sujet */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-neutral-200">
              <h2 className="flex items-center font-bold mb-4 text-neutral-700">
                <FileText className="w-4 h-4 mr-2 text-orange-500" /> Contenu de l'article
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase text-neutral-400 mb-1">
                    Sujet principal
                  </label>
                  <textarea
                    rows={3}
                    className="w-full p-3 border rounded-xl bg-neutral-50 focus:ring-2 focus:ring-orange-500 outline-none transition-shadow"
                    value={formData.topic}
                    onChange={(e) => updateField("topic", e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase text-neutral-400 mb-1">
                      Nb Recettes
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="100"
                      className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-orange-500 outline-none"
                      value={formData.recipe_count}
                      onChange={(e) => handleNumberChange("recipe_count", e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase text-neutral-400 mb-1">
                      Nb Images
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="100"
                      className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-orange-500 outline-none"
                      value={formData.image_count}
                      onChange={(e) => handleNumberChange("image_count", e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Section Image & Style */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-neutral-200">
              <h2 className="flex items-center font-bold mb-4 text-neutral-700">
                📷 Configuration Visuelle
              </h2>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase text-neutral-400 mb-1">
                      Moteur d'images
                    </label>
                    <select
                      className="w-full p-3 border rounded-xl bg-white focus:ring-2 focus:ring-orange-500 outline-none"
                      value={formData.image_engine}
                      onChange={(e) => updateField("image_engine", e.target.value as ApiRequest["image_engine"])}
                    >
                      <option value="flux_replicate">Flux (Replicate)</option>
                      <option value="flux_pro">Flux Pro</option>
                      <option value="midjourney">Midjourney</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase text-neutral-400 mb-1">
                      Format
                    </label>
                    <select
                      className="w-full p-3 border rounded-xl bg-white focus:ring-2 focus:ring-orange-500 outline-none"
                      value={formData.output.image_format}
                      onChange={(e) => updateNested("output", "image_format", e.target.value)}
                    >
                      <option value="jpg">JPG</option>
                      <option value="png">PNG</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-neutral-400 mb-1">
                    Référence de style (URL)
                  </label>
                  <input
                    type="url"
                    placeholder="https://..."
                    className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-orange-500 outline-none"
                    value={formData.style_ref_url}
                    onChange={(e) => updateField("style_ref_url", e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-neutral-400 mb-1">
                    Prompt Override (Optionnel)
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Ex: photorealistic, top-down view..."
                    className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-orange-500 outline-none"
                    value={formData.prompt_override}
                    onChange={(e) => updateField("prompt_override", e.target.value)}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-gradient-to-br from-orange-600 to-orange-700 p-6 rounded-2xl shadow-lg text-white">
              <h2 className="flex items-center font-bold mb-4">
                <Mail className="w-4 h-4 mr-2" /> Livraison
              </h2>
              <label className="block text-xs font-bold uppercase opacity-70 mb-1">
                Email client
              </label>
              <input
                type="email"
                className="w-full p-3 border-none rounded-xl text-neutral-900 focus:ring-2 focus:ring-white outline-none"
                placeholder="client@email.com"
                value={formData.client.email}
                onChange={(e) => updateNested("client", "email", e.target.value)}
              />
              
              <button type="submit"
                onClick={handleSubmit}
                disabled={isLoading}
                className="w-full bg-white text-orange-600 font-black py-4 rounded-xl mt-6 flex items-center justify-center hover:bg-orange-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
              >
                {isLoading ? (
                  <Loader2 className="animate-spin w-6 h-6" />
                ) : (
                  <>
                    <Rocket className="w-5 h-5 mr-2" /> GÉNÉRER
                  </>
                )}
              </button>
            </div>

            {result?.status === "started" && (
              <div className="bg-green-50 border-2 border-green-200 p-6 rounded-2xl text-center">
                <h3 className="font-bold text-green-900 flex items-center justify-center">
                  <Rocket className="w-5 h-5 mr-2" /> Succès !
                </h3>
                <p className="text-sm text-green-700 mt-2">
                  Commande lancée. Vérifiez votre boîte mail dans 20-30 min.
                </p>
                {result.request_id && (
                  <p className="text-xs text-green-600 mt-2 font-mono">
                    ID: {result.request_id}
                  </p>
                )}
              </div>
            )}
            
            {error && (
              <div className="bg-red-50 border-2 border-red-200 p-6 rounded-2xl text-red-700">
                <p className="font-bold flex items-center">
                  <AlertCircle className="w-4 h-4 mr-2" /> Erreur
                </p>
                <p className="text-sm mt-2">{error}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

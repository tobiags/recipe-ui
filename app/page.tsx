"use client";

import { useState, FormEvent } from "react";
import { Loader2, AlertCircle, Mail, Rocket, Settings, Image as ImageIcon, FileText } from "lucide-react";

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
};

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

  const updateField = (field: keyof ApiRequest, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const updateNested = (parent: "output" | "client", field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [parent]: { ...prev[parent], [field]: value },
    }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!formData.client.email?.trim()) {
      setError("L'email est obligatoire pour la livraison asynchrone.");
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

      const response = await fetch(`${process.env.NEXT_PUBLIC_N8N_API_URL}/webhook/v1/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (data.status === "error") throw new Error(data.error?.message || "Erreur serveur");
      setResult(data);
    } catch (err: any) {
      setError(err.message || "Une erreur est survenue.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#FDF8F6] p-4 md:p-12 font-sans text-neutral-900">
      <div className="max-w-5xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-neutral-800">Console Recettes <span className="text-orange-600">PRO</span></h1>
          <p className="text-neutral-500">Configuration complète pour générations massives par email.</p>
        </div>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            {/* Section Sujet */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-neutral-200">
              <h2 className="flex items-center font-bold mb-4 text-neutral-700"><FileText className="w-4 h-4 mr-2 text-orange-500" /> Contenu de l'article</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase text-neutral-400 mb-1">Sujet principal</label>
                  <textarea
                    required
                    rows={3}
                    className="w-full p-3 border rounded-xl bg-neutral-50 focus:ring-2 focus:ring-orange-500 outline-none"
                    value={formData.topic}
                    onChange={(e) => updateField("topic", e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase text-neutral-400 mb-1">Nb Recettes</label>
                    <input type="number" className="w-full p-3 border rounded-xl" value={formData.recipe_count} onChange={(e) => updateField("recipe_count", parseInt(e.target.value))} />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase text-neutral-400 mb-1">Nb Images</label>
                    <input type="number" className="w-full p-3 border rounded-xl" value={formData.image_count} onChange={(e) => updateField("image_count", parseInt(e.target.value))} />
                  </div>
                </div>
              </div>
            </div>

            {/* Section Image & Style */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-neutral-200">
              <h2 className="flex items-center font-bold mb-4 text-neutral-700"><ImageIcon className="w-4 h-4 mr-2 text-blue-500" /> Configuration Visuelle</h2>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase text-neutral-400 mb-1">Moteur d'images</label>
                    <select className="w-full p-3 border rounded-xl bg-white" value={formData.image_engine} onChange={(e) => updateField("image_engine", e.target.value)}>
                      <option value="flux_replicate">Flux (Replicate)</option>
                      <option value="flux_pro">Flux Pro</option>
                      <option value="midjourney">Midjourney</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase text-neutral-400 mb-1">Format</label>
                    <select className="w-full p-3 border rounded-xl bg-white" value={formData.output.image_format} onChange={(e) => updateNested("output", "image_format", e.target.value)}>
                      <option value="jpg">JPG</option>
                      <option value="png">PNG</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-neutral-400 mb-1">Référence de style (URL)</label>
                  <input type="url" placeholder="https://..." className="w-full p-3 border rounded-xl" value={formData.style_ref_url || ""} onChange={(e) => updateField("style_ref_url", e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-neutral-400 mb-1">Prompt Override (Optionnel)</label>
                  <textarea rows={2} placeholder="Ex: photorealistic, top-down view..." className="w-full p-3 border rounded-xl" value={formData.prompt_override || ""} onChange={(e) => updateField("prompt_override", e.target.value)} />
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-orange-600 p-6 rounded-2xl shadow-lg text-white">
              <h2 className="flex items-center font-bold mb-4"><Mail className="w-4 h-4 mr-2" /> Livraison</h2>
              <label className="block text-xs font-bold uppercase opacity-70 mb-1">Email client</label>
              <input type="email" required className="w-full p-3 border-none rounded-xl text-neutral-900" placeholder="client@email.com" value={formData.client.email || ""} onChange={(e) => updateNested("client", "email", e.target.value)} />
              
              <button type="submit" disabled={isLoading} className="w-full bg-white text-orange-600 font-black py-4 rounded-xl mt-6 flex items-center justify-center hover:bg-orange-50 transition-colors disabled:opacity-50">
                {isLoading ? <Loader2 className="animate-spin w-6 h-6" /> : <><Rocket className="w-5 h-5 mr-2" /> GÉNÉRER</>}
              </button>
            </div>

            {result?.status === "started" && (
              <div className="bg-green-50 border-2 border-green-200 p-6 rounded-2xl text-center">
                <h3 className="font-bold text-green-900">Succès !</h3>
                <p className="text-sm text-green-700 mt-2">Commande lancée. Vérifiez votre boîte mail dans 20-30 min.</p>
              </div>
            )}
            {error && (
              <div className="bg-red-50 border-2 border-red-200 p-6 rounded-2xl text-red-700">
                <p className="font-bold">Erreur</p>
                <p className="text-sm">{error}</p>
              </div>
            )}
          </div>
        </form>
      </div>
    </main>
  );
}

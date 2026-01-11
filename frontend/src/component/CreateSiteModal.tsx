import React, { useEffect, useRef, useState } from "react";
import { X, UploadCloud, Image as ImageIcon } from "lucide-react";

interface CreateSiteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (input: { name: string; description?: string; image?: string,contractValue : number; }) => void | Promise<void>;
}

const CreateSiteModal: React.FC<CreateSiteModalProps> = ({ isOpen, onClose, onCreate }) => {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [contractValue, setcontractValue] = useState<string>("");
  const [imageData, setImageData] = useState<string | undefined>(undefined);
  const [imageName, setImageName] = useState<string>("");
  const [preview, setPreview] = useState<string | undefined>(undefined);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      setName("");
      setDescription("");
      setcontractValue("")
      setImageData(undefined);
      setPreview(undefined);
      setImageName("");
      setSubmitting(false);
    }
  }, [isOpen]);

  if (!isOpen) {
    return null;
  }

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      setImageData(undefined);
      setPreview(undefined);
      setImageName("");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setImageData(result);
      setPreview(result);
      setImageName(file.name);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!name.trim()) {
      return;
    }

    try {
      
      setSubmitting(true);
      const numericcontractValue = contractValue ? Number(contractValue.toString().replace(/,/g, "").trim()) : 0;
      await Promise.resolve(
        onCreate({
          name: name.trim(),
          description: description.trim() ? description.trim() : undefined,
          contractValue : numericcontractValue,
          image: imageData,
        })
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 px-4 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div 
        className="w-full max-w-lg rounded-2xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Create new site</h2>
            <p className="text-sm text-gray-500">Add a workspace for a new client or property</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 px-6 py-5">
          <label className="flex flex-col gap-2 text-sm font-medium text-gray-700">
            Site name
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Aditya Birla - Corporate Office"
              required
              className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-black focus:ring-2 focus:ring-black/10"
            />
          </label>

          <label className="flex flex-col gap-2 text-sm font-medium text-gray-700">
            Description (optional)
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Share the location, scope, or phase of this site."
              rows={3}
              className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-black focus:ring-2 focus:ring-black/10"
            />
          </label>

          <label className="flex flex-col gap-2 text-sm font-medium text-gray-700">
            Site contractValue
            <input
              type = 'number'
              value={contractValue}
              onChange={(event) => setcontractValue(event.target.value)}
              placeholder="add contractValue of your site."
              className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-black focus:ring-2 focus:ring-black/10"
            />
          </label>

          <div className="flex flex-col gap-3">
            <span className="text-sm font-medium text-gray-700">Cover image (optional)</span>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center justify-center gap-2 rounded-xl border border-dashed border-gray-300 bg-gray-50 px-4 py-6 text-sm font-medium text-gray-600 transition hover:border-gray-400 hover:bg-gray-100"
            >
              <UploadCloud className="h-5 w-5" />
              {imageName ? `Replace image (${imageName})` : "Upload cover"}
            </button>

            {preview && (
              <div className="relative overflow-hidden rounded-xl border border-gray-200">
                <img src={preview} alt="Site preview" className="h-48 w-full object-cover" />
                <button
                  type="button"
                  onClick={() => {
                    setPreview(undefined);
                    setImageData(undefined);
                    setImageName("");
                    if (fileInputRef.current) {
                      fileInputRef.current.value = "";
                    }
                  }}
                  className="absolute top-3 right-3 flex items-center gap-1 rounded-full bg-white/90 px-3 py-1 text-xs font-medium text-gray-700 shadow"
                >
                  <ImageIcon className="h-3.5 w-3.5" />
                  Remove image
                </button>
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-gray-100 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!name.trim() || submitting}
              className="rounded-xl bg-black px-4 py-2 text-sm font-semibold uppercase tracking-[0.25em] text-white transition hover:bg-black/90 disabled:cursor-not-allowed disabled:bg-black/40"
            >
              {submitting ? "Saving" : "Create"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateSiteModal;

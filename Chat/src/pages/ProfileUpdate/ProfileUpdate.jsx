import React, { useState, useEffect, useCallback } from "react";
import assets from "../../assets/assets";
import { useApp } from "../../context/AppContext";
import { usersAPI } from "../../config/api";
import { toast } from "react-toastify";
import Cropper from "react-easy-crop";

function ProfileUpdate() {
  const [image, setImage] = useState(null);
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [prevImage, setPrevImage] = useState("");
  const [loading, setLoading] = useState(false);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [imageSrc, setImageSrc] = useState(null);
  const [showCropper, setShowCropper] = useState(false);
  const { user, setUser } = useApp();

  useEffect(() => {
    if (user) {
      setName(user.name || "");
      setBio(user.bio || "");
      setPrevImage(user.avatar || "");
    }
  }, [user]);

  const onCropComplete = useCallback((_, croppedAreaPixels) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const createImage = (url) =>
    new Promise((resolve, reject) => {
      const image = new Image();
      image.addEventListener("load", () => resolve(image));
      image.addEventListener("error", reject);
      image.src = url;
    });

  const getCroppedImage = useCallback(async () => {
    try {
      const image = await createImage(imageSrc);
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");

      canvas.width = croppedAreaPixels.width;
      canvas.height = croppedAreaPixels.height;

      ctx.drawImage(
        image,
        croppedAreaPixels.x,
        croppedAreaPixels.y,
        croppedAreaPixels.width,
        croppedAreaPixels.height,
        0,
        0,
        croppedAreaPixels.width,
        croppedAreaPixels.height
      );

      return new Promise((resolve) => {
        canvas.toBlob(
          (file) => {
            setImage(file);
            resolve(URL.createObjectURL(file));
          },
          "image/jpeg",
          1
        );
      });
    } catch (e) {
      console.error(e);
    }
  }, [imageSrc, croppedAreaPixels]);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Image size should be less than 5MB");
        return;
      }
      if (!file.type.startsWith("image/")) {
        toast.error("Please select an image file");
        return;
      }

      const url = URL.createObjectURL(file);
      setImageSrc(url);
      setShowCropper(true);
    }
  };

  const handleCrop = async () => {
    const croppedImageUrl = await getCroppedImage();
    setPrevImage(croppedImageUrl);
    setShowCropper(false);
    setImageSrc(null);
    setCroppedAreaPixels(null);
  };

  const profileUpdate = async (event) => {
    event.preventDefault();
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append("name", name);
      formData.append("bio", bio);

      if (image) {
        formData.append("avatar", image);
      }

      const response = await usersAPI.updateProfile(formData);

      if (response.data.success) {
        setUser(response.data.user);
        setPrevImage(response.data.user.avatar || "");
        setImage(null);
        toast.success("Profile updated successfully!");
      }
    } catch (error) {
      toast.error(error.response?.data?.message || error.message);
    } finally {
      setLoading(false);
    }
  };

  if (showCropper) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[url('/background.png')] bg-cover">
        <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-lg">
          <h3 className="text-lg font-medium mb-4 text-center">Crop Your Image</h3>
          <div className="relative w-full h-64 bg-black">
            <Cropper
              image={imageSrc}
              crop={crop}
              zoom={zoom}
              aspect={1}
              onCropChange={setCrop}
              onCropComplete={onCropComplete}
              onZoomChange={setZoom}
            />
          </div>
          <div className="flex gap-4 justify-center mt-4">
            <button
              onClick={handleCrop}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Crop & Continue
            </button>
            <button
              onClick={() => {
                setShowCropper(false);
                setImageSrc(null);
              }}
              className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[url('/background.png')] bg-cover">
      <div className="bg-white flex items-center justify-between rounded-lg shadow-lg min-w-[700px]">
        <form
          onSubmit={profileUpdate}
          className="flex flex-col gap-5 p-10"
        >
          <h3 className="text-lg font-medium">Profile Details</h3>

          <label
            htmlFor="avatar"
            className="flex items-center gap-3 text-gray-500 cursor-pointer"
          >
            <input
              onChange={handleImageChange}
              type="file"
              id="avatar"
              accept=".png, .jpg, .jpeg, .webp"
              hidden
            />
            <img
              src={prevImage || assets.avatar_icon}
              alt="Profile Preview"
              className="w-12 h-12 rounded-full object-cover"
            />
            {prevImage ? "Change Profile Image" : "Upload Profile Image"}
          </label>

          <input
            onChange={(e) => setName(e.target.value)}
            value={name}
            type="text"
            placeholder="Your Name"
            name="name"
            required
            className="p-2 min-w-[300px] border border-gray-300 rounded outline-[#077eff]"
          />

          <textarea
            onChange={(e) => setBio(e.target.value)}
            value={bio}
            placeholder="Write profile bio"
            rows="4"
            className="p-2 min-w-[300px] border border-gray-300 rounded outline-[#077eff]"
          ></textarea>

          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 bg-[#077eff] text-white text-base rounded hover:bg-[#0566d1] disabled:bg-gray-400"
          >
            {loading ? "Saving..." : "Save Changes"}
          </button>
        </form>

        <img
          className="max-w-[160px] aspect-square m-5 rounded-full object-cover"
          src={prevImage || assets.logo_icon}
          alt="Profile"
        />
      </div>
    </div>
  );
}

export default ProfileUpdate;

import { Request, Response } from "express";
import Gallery from "../model/galleryModel.js";
import galleryError from "../utils/error/galleryError.js";

// login required
export const createGallery = async (req: Request, res: Response) => {
    const { title, description, galleryId } = req.body;
    if (!galleryId) {
        throw new galleryError.GalleryError("Gallery ID is required");
    }
    if (await Gallery.findOne({ galleryId })) {
        throw new galleryError.GalleryError("Gallery ID already exists");
    }
    await Gallery.create({ galleryId, title, description, galleryAdmin: req.user?.userid });
    res.status(201).json({ message: "Gallery created successfully" });
};

// login required
export const getGallery = async (req: Request, res: Response) => {
    const { galleryId } = req.params;
    const gallery = await Gallery.findOne({ galleryId });
    if (!gallery) {
        throw new galleryError.GalleryNotFoundError("Gallery not found");
    }
    res.status(200).json(gallery);
};

// login required
export const getGalleryList = async (req: Request, res: Response) => {
    const { page, limit, search } = req.query;
    const galleries = await Gallery.find({ title: { $regex: search, $options: "i" } }).skip((Number(page) - 1) * Number(limit)).limit(Number(limit));
    res.status(200).json(galleries);
};

// login required
export const updateGallery = async (req: Request, res: Response) => {
    const { galleryId } = req.params;
    const { title, description } = req.body;
    const gallery = await Gallery.findOne({ galleryId });
    if (!gallery) {
        throw new galleryError.GalleryNotFoundError("Gallery not found");
    }
    if (gallery.galleryAdmin !== req.user?.userid) {
        throw new galleryError.GalleryIsNotAdminError("You are not the admin of this gallery");
    }
    await Gallery.updateOne({ galleryId }, { title, description });
    res.status(200).json({ message: "Gallery updated successfully" });
};

// login required
export const deleteGallery = async (req: Request, res: Response) => {
    const { galleryId } = req.params;
    const gallery = await Gallery.findOne({ galleryId });
    if (!gallery) {
        throw new galleryError.GalleryNotFoundError("Gallery not found");
    }
    if (gallery.galleryAdmin !== req.user?.userid) {
        throw new galleryError.GalleryIsNotAdminError("You are not the admin of this gallery");
    }
    await Gallery.deleteOne({ galleryId });
    res.status(200).json({ message: "Gallery deleted successfully" });
};

// login required
export const subscribeGallery = async (req: Request, res: Response) => {
    const { galleryId } = req.params;
    const gallery = await Gallery.findOne({ galleryId });
    if (!gallery) {
        throw new galleryError.GalleryNotFoundError("Gallery not found");
    }
    await gallery.subscribe(req.user?.userid as string);
    res.status(200).json({ message: "Gallery subscribed successfully" });
};

// login required
export const unsubscribeGallery = async (req: Request, res: Response) => {
    const { galleryId } = req.params;
    const gallery = await Gallery.findOne({ galleryId });
    if (!gallery) {
        throw new galleryError.GalleryNotFoundError("Gallery not found");
    }
    await gallery.unsubscribe(req.user?.userid as string);
    res.status(200).json({ message: "Gallery unsubscribed successfully" });
};

// login required
export const galleryAdminChange = async (req: Request, res: Response) => {
    const { galleryId } = req.params;
    const { admin } = req.body;
    const gallery = await Gallery.findOne({ galleryId });
    if (!gallery) {
        throw new galleryError.GalleryNotFoundError("Gallery not found");
    }
    if (gallery.galleryAdmin !== req.user?.userid) {
        throw new galleryError.GalleryIsNotAdminError("You are not the admin of this gallery");
    }
    await gallery.galleryAdminChange(admin);
    res.status(200).json({ message: "Gallery admin changed successfully" });
};

// login required
export const galleryManagerAdd = async (req: Request, res: Response) => {
    const { galleryId } = req.params;
    const { manager } = req.body;
    const gallery = await Gallery.findOne({ galleryId });
    if (!gallery) {
        throw new galleryError.GalleryNotFoundError("Gallery not found");
    }
    if (gallery.galleryAdmin !== req.user?.userid) {
        throw new galleryError.GalleryIsNotAdminError("You are not the admin of this gallery");
    }
    if (gallery.galleryManager.includes(manager)) {
        throw new galleryError.GalleryInteractionFailedError("You are already a manager of this gallery");
    }
    await gallery.galleryManagerAdd(manager);
    res.status(200).json({ message: "Gallery manager added successfully" });
};

// login required
export const galleryManagerDelete = async (req: Request, res: Response) => {
    const { galleryId } = req.params;
    const { manager } = req.body;
    const gallery = await Gallery.findOne({ galleryId });
    if (!gallery) {
        throw new galleryError.GalleryNotFoundError("Gallery not found");
    }
    if (gallery.galleryAdmin !== req.user?.userid) {
        throw new galleryError.GalleryIsNotAdminError("You are not the admin of this gallery");
    }
    if (!gallery.galleryManager.includes(manager)) {
        throw new galleryError.GalleryInteractionFailedError("You are not a manager of this gallery");
    }
    await gallery.galleryManagerDelete(manager);
    res.status(200).json({ message: "Gallery manager deleted successfully" });
};

// login required
export const galleryThumbnailUpload = async (req: Request, res: Response) => {
    const { galleryId } = req.params;
    const { thumbnail } = req.body;
    const gallery = await Gallery.findOne({ galleryId });
    if (!gallery) {
        throw new galleryError.GalleryNotFoundError("Gallery not found");
    }
    if (gallery.galleryAdmin !== req.user?.userid) {
        throw new galleryError.GalleryIsNotAdminError("You are not the admin of this gallery"); 
    }
    await gallery.galleryThumbnailUpload(thumbnail);
    res.status(200).json({ message: "Gallery thumbnail uploaded successfully" });
};

// login required
export const galleryThumbnailDelete = async (req: Request, res: Response) => {
    const { galleryId } = req.params;
    const gallery = await Gallery.findOne({ galleryId });
    if (!gallery) {
        throw new galleryError.GalleryNotFoundError("Gallery not found");
    }
    if (gallery.galleryAdmin !== req.user?.userid) {
        throw new galleryError.GalleryIsNotAdminError("You are not the admin of this gallery");
    }
    await gallery.galleryThumbnailDelete();
    res.status(200).json({ message: "Gallery thumbnail deleted successfully" });
};

// login required
export const addGalleryBlockUser = async (req: Request, res: Response) => {
    const { galleryId } = req.params;
    const { userid, time } = req.body;
    const gallery = await Gallery.findOne({ galleryId });
    if (!gallery) {
        throw new galleryError.GalleryNotFoundError("Gallery not found");
    }
    if (gallery.galleryAdmin !== req.user?.userid || !gallery.galleryManager.includes(req.user?.userid as string)) {
        throw new galleryError.GalleryIsNotManagerError("You are not the manager of this gallery");
    }
    
    const blockUsers = await gallery.getGalleryBlockUsers();
    if (blockUsers.includes(userid)) {
        throw new galleryError.GalleryInteractionFailedError("You are already blocking this user");
    }

    if (time < 0) {
        throw new galleryError.GalleryInteractionFailedError("Time cannot be negative");
    }

    await gallery.addGalleryBlockUser(userid, time);
    res.status(200).json({ message: "Gallery block user added successfully" });
};

// login required
export const deleteGalleryBlockUser = async (req: Request, res: Response) => {
    const { galleryId } = req.params;
    const { userid } = req.body;
    const gallery = await Gallery.findOne({ galleryId });
    if (!gallery) {
        throw new galleryError.GalleryNotFoundError("Gallery not found");
    }
    if (gallery.galleryAdmin !== req.user?.userid || !gallery.galleryManager.includes(req.user?.userid as string)) {
        throw new galleryError.GalleryIsNotManagerError("You are not the manager of this gallery");
    }

    const blockUsers = await gallery.getGalleryBlockUsers();
    if (!blockUsers.includes(userid)) {
        throw new galleryError.GalleryInteractionFailedError("You are not blocking this user");
    }

    await gallery.deleteGalleryBlockUser(userid);
    res.status(200).json({ message: "Gallery block user deleted successfully" });
};

// login required
export const addGalleryBlockIP = async (req: Request, res: Response) => {
    const { galleryId } = req.params;
    const { ip, time } = req.body;
    const gallery = await Gallery.findOne({ galleryId });
    if (!gallery) {
        throw new galleryError.GalleryNotFoundError("Gallery not found");
    }
    if (gallery.galleryAdmin !== req.user?.userid || !gallery.galleryManager.includes(req.user?.userid as string)) {
        throw new galleryError.GalleryIsNotManagerError("You are not the manager of this gallery");
    }

    const blockIPs = await gallery.getGalleryBlockIPs();
    if (blockIPs.includes(ip)) {
        throw new galleryError.GalleryInteractionFailedError("You are already blocking this IP");
    }

    if (time < 0) {
        throw new galleryError.GalleryInteractionFailedError("Time cannot be negative");
    }

    await gallery.addGalleryBlockIP(ip, time);
    res.status(200).json({ message: "Gallery block IP added successfully" });
};

// login required
export const deleteGalleryBlockIP = async (req: Request, res: Response) => {
    const { galleryId } = req.params;
    const { ip } = req.body;
    const gallery = await Gallery.findOne({ galleryId });
    if (!gallery) {
        throw new galleryError.GalleryNotFoundError("Gallery not found");
    }
    if (gallery.galleryAdmin !== req.user?.userid || !gallery.galleryManager.includes(req.user?.userid as string)) {
        throw new galleryError.GalleryIsNotManagerError("You are not the manager of this gallery");
    }

    const blockIPs = await gallery.getGalleryBlockIPs();
    if (!blockIPs.includes(ip)) {
        throw new galleryError.GalleryInteractionFailedError("You are not blocking this IP");
    }

    await gallery.deleteGalleryBlockIP(ip);
    res.status(200).json({ message: "Gallery block IP deleted successfully" });
};


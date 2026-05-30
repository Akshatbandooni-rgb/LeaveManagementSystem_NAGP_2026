import { Request, Response, NextFunction } from 'express';
import * as userService from '../services/user.service';

export function getById(req: Request, res: Response, next: NextFunction): void {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const user = userService.getUserById(id);
    res.status(200).json(user);
  } catch (err) {
    next(err);
  }
}

export function getAll(_req: Request, res: Response, next: NextFunction): void {
  try {
    const users = userService.getAllUsers();
    res.status(200).json(users);
  } catch (err) {
    next(err);
  }
}

export function create(req: Request, res: Response, next: NextFunction): void {
  try {
    const user = userService.createUser(req.body);
    res.status(201).json(user);
  } catch (err) {
    next(err);
  }
}

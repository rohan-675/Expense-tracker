import SavingsGoal from "../models/SavingsGoal.js";

export const getGoals = async (req, res, next) => {
  try {
    const goals = await SavingsGoal.find({ userId: req.user._id }).sort({ createdAt: -1 });
    res.json(goals);
  } catch (error) {
    next(error);
  }
};

export const createGoal = async (req, res, next) => {
  try {
    const { name, targetAmount, savedAmount = 0, targetDate } = req.body;

    if (!name || !targetAmount) {
      res.status(400);
      throw new Error("Goal name and target amount are required");
    }

    const goal = await SavingsGoal.create({
      userId: req.user._id,
      name,
      targetAmount,
      savedAmount,
      targetDate
    });

    res.status(201).json(goal);
  } catch (error) {
    next(error);
  }
};

export const updateGoal = async (req, res, next) => {
  try {
    const goal = await SavingsGoal.findOne({ _id: req.params.id, userId: req.user._id });

    if (!goal) {
      res.status(404);
      throw new Error("Goal not found");
    }

    ["name", "targetAmount", "savedAmount", "targetDate"].forEach((field) => {
      if (req.body[field] !== undefined) goal[field] = req.body[field];
    });

    const updatedGoal = await goal.save();
    res.json(updatedGoal);
  } catch (error) {
    next(error);
  }
};

export const deleteGoal = async (req, res, next) => {
  try {
    const goal = await SavingsGoal.findOneAndDelete({ _id: req.params.id, userId: req.user._id });

    if (!goal) {
      res.status(404);
      throw new Error("Goal not found");
    }

    res.json({ message: "Goal deleted successfully" });
  } catch (error) {
    next(error);
  }
};


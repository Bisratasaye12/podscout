import Subscriptions from "../models/subscriptions.js";

// The email always comes from the verified token, so a user can only
// read and change their own subscriptions.
const updateSubs = async (req, res, next) => {
  const { subscriptions } = req.body;

  if (!Array.isArray(subscriptions))
    return res.status(400).json({ message: "subscriptions must be an array" });

  try {
    const updatedRecord = await Subscriptions.findOneAndUpdate(
      { email: req.userEmail },
      { subscriptions },
      {
        new: true, //set the new option to true to return the document after update was applied
      }
    );
    if (!updatedRecord)
      return res.status(404).json({ message: "No subscriptions for this user" });

    res.status(200).json(updatedRecord);
  } catch (error) {
    next(error);
  }
};

const getSubs = async (req, res, next) => {
  try {
    const existingRecord = await Subscriptions.findOne({ email: req.userEmail });
    if (!existingRecord)
      return res.status(404).json({ message: "No subscriptions for this user" });

    res.status(200).json(existingRecord.subscriptions);
  } catch (error) {
    next(error);
  }
};

export { getSubs, updateSubs };

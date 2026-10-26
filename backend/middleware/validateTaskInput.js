const VALID_PRIORITIES = ['low', 'medium', 'high'];

function validateTaskInput(req, res, next) {
  const { title, priority } = req.body;
  const isCreate = req.method === 'POST';

  if (isCreate && (!title || typeof title !== 'string' || title.trim() === '')) {
    return res.status(400).json({
      error: 'Bad Request',
      message: "Field 'title' is required and must be a non-empty string",
    });
  }

  if (title !== undefined && (typeof title !== 'string' || title.trim() === '')) {
    return res.status(400).json({
      error: 'Bad Request',
      message: "Field 'title' must be a non-empty string",
    });
  }

  if (isCreate && (!priority || !VALID_PRIORITIES.includes(priority))) {
    return res.status(400).json({
      error: 'Bad Request',
      message: "Field 'priority' is required and must be one of: low, medium, high",
    });
  }

  if (priority !== undefined && !VALID_PRIORITIES.includes(priority)) {
    return res.status(400).json({
      error: 'Bad Request',
      message: "Field 'priority' must be one of: low, medium, high",
    });
  }

  next();
}

module.exports = validateTaskInput;

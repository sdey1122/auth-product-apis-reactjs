const sanitizeUser = (user) => {
  const userObject = user.toObject ? user.toObject() : { ...user };

  delete userObject.password;
  delete userObject.__v;
  delete userObject.emailVerificationToken;
  delete userObject.emailVerificationExpires;

  return userObject;
};

module.exports = sanitizeUser;

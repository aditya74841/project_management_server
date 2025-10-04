import crypto from "crypto";
import jwt from "jsonwebtoken";
import { UserLoginType, UserRolesEnum } from "../constants.js";
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import {
  getLocalPath,
  getStaticFilePath,
  removeLocalFile,
} from "../utils/helpers.js";

import {
  emailVerificationMailgenContent,
  forgotPasswordMailgenContent,
  sendEmail,
  sendPlainTextEmail,
} from "../utils/mail.js";

const generateAccessAndRefreshTokens = async (userId) => {
  try {
    const user = await User.findById(userId);

    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    user.refreshToken = refreshToken;

    await user.save({ validateBeforeSave: false });

    return { accessToken, refreshToken };
  } catch (error) {
    throw new ApiError(
      500,
      "Something went wrong while generating the access token"
    );
  }
};

const registerUser = asyncHandler(async (req, res) => {
  const { name, email, password, role, phoneNumber = null } = req.body;



  console.log("Checking console on registerUser Controller");

  // const existedUser = await User.findOne({
  //   $or: [{ phoneNumber }, { email }],
  // });

  const existedUser = await User.findOne({
    email,
  });

  if (existedUser) {
    throw new ApiError(409, "User with email or PhoneNumer already exists", []);
  }

  const user = await User.create({
    name,
    email,
    password,
    username: email?.split(`@`)[0],
    phoneNumber: phoneNumber || null,
    isEmailVerified: false,
    role: role || UserRolesEnum.USER,
  });

  const { unHashedToken, hashedToken, tokenExpiry } =
    user.generateTemporaryToken();

  user.emailVerificationToken = hashedToken;
  user.emailVerificationExpiry = tokenExpiry;

  await user.save({ validateBeforeSave: false });

  // await sendEmail({
  //   email: user?.email,
  //   subject: "Please verify your email",
  //   mailgenContent: emailVerificationMailgenContent(
  //     user.name,
  //     `${req.protocol}://${req.get(
  //       "host"
  //     )}/api/v1/users/verify-email/${unHashedToken}`
  //   ),
  // });

  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken -emailVerificationToken -emailVerificationExpiry"
  );

  if (!createdUser) {
    throw new ApiError(500, "Something went wrong while registering the user");
  }

  return res
    .status(201)
    .json(
      new ApiResponse(
        200,
        { user: createdUser },
        "Users registered successfully and verification email has been sent on your email."
      )
    );
});

// Function to generate random password
function generateRandomPassword() {
  const length = 8;
  const charset =
    "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let password = "";
  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * charset.length);
    password += charset[randomIndex];
  }
  return password;
}

const loginUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email) {
    throw new ApiError(400, "Username or email is required");
  }

  const user = await User.findOne({
    email,
  });

  // const user = await User.findOne({
  //   $or: [{ phoneNumber }, { email }],
  // });

  // console.log("The user is ", user);

  if (!user) {
    throw new ApiError(404, "User does not exists");
  }

  if (user.loginType !== UserLoginType.EMAIL_PASSWORD) {
    throw new ApiError(
      400,
      `You have previously registered using ${user.loginType.toLowerCase()}. Please use ${user.loginType.toLowerCase()} login.`
    );
  }

  const isPasswordValid = await user.isPasswordCorrect(password);

  if (!isPasswordValid) {
    throw new ApiError(401, "Invalid user credentials");
  }

  const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(
    user._id
  );

  const loggedInUser = await User.findById(user._id).select(
    "-password -refreshToken -emailVerificationToken -emailVerificationExpiry"
  );
  const accessTokenExpiry = 1000 * 60 * 60 * 24 * 7; // 7 days in ms
  const refreshTokenExpiry = 1000 * 60 * 60 * 24 * 7; // 7 days in ms
  
  const cookieOptionsAccess = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "none",
    maxAge: accessTokenExpiry,
    path: "/",
  };
  
  const cookieOptionsRefresh = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "none",
    maxAge: refreshTokenExpiry,
    path: "/",
  };
  return res
    .status(200)
    .cookie("accessToken", accessToken, cookieOptionsAccess)
    .cookie("refreshToken", refreshToken, cookieOptionsRefresh)
    .json(
      new ApiResponse(
        200,
        { user: loggedInUser, accessToken },
        "User logged in successfully"
      )
    );
});



const logoutUser = asyncHandler(async (req, res) => {
  // await User.findByIdAndUpdate(
  //   req.user._id,
  //   {
  //     $set: {
  //       refreshToken: undefined,
  //     },
  //   },
  //   { new: true }
  // );

  await User.findByIdAndUpdate(req.user._id, { $set: { refreshToken: undefined } });

  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/", 
  };

  return res
    .status(200)
    .clearCookie("accessToken", cookieOptions)
    .clearCookie("refreshToken", cookieOptions)
    .json(new ApiResponse(200, {}, "User logged out"));
});

const verifyEmail = asyncHandler(async (req, res) => {
  const { verificationToken } = req.params;

  if (!verificationToken) {
    throw new ApiError(400, "Email verification token is missing");
  }

  // generate a hash from the token that we are receiving
  let hashedToken = crypto
    .createHash("sha256")
    .update(verificationToken)
    .digest("hex");

  // While registering the user, same time when we are sending the verification mail
  // we have saved a hashed value of the original email verification token in the db
  // We will try to find user with the hashed token generated by received token
  // If we find the user another check is if token expiry of that token is greater than current time if not that means it is expired
  const user = await User.findOne({
    emailVerificationToken: hashedToken,
    emailVerificationExpiry: { $gt: Date.now() },
  });

  if (!user) {
    throw new ApiError(489, "Token is invalid or expired");
  }

  // If we found the user that means the token is valid
  // Now we can remove the associated email token and expiry date as we no  longer need them
  user.emailVerificationToken = undefined;
  user.emailVerificationExpiry = undefined;
  // Tun the email verified flag to `true`
  user.isEmailVerified = true;

  await user.save({ validateBeforeSave: false });

  return res
    .status(200)
    .json(new ApiResponse(200, { isEmailVerified: true }, "Email is verified"));
});

const resendEmailVerification = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user?._id);

  if (!user) {
    throw new ApiError(404, "User does not exists", []);
  }

  // if email is already verified throw an error
  if (user.isEmailVerified) {
    throw new ApiError(409, "Email is already verified!");
  }

  const { unHashedToken, hashedToken, tokenExpiry } =
    user.generateTemporaryToken(); // generate email verification creds

  user.emailVerificationToken = hashedToken;
  user.emailVerificationExpiry = tokenExpiry;
  await user.save({ validateBeforeSave: false });

  await sendEmail({
    email: user?.email,
    subject: "Please verify your email",
    mailgenContent: emailVerificationMailgenContent(
      user.username,
      `${req.protocol}://${req.get(
        "host"
      )}/api/v1/users/verify-email/${unHashedToken}`
    ),
  });
  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Mail has been sent to your mail ID"));
});

const refreshAccessToken = asyncHandler(async (req, res) => {
  const incomingRefreshToken =
    req.cookies.refreshToken || req.body.refreshToken;

  if (!incomingRefreshToken) {
    throw new ApiError(401, "Unauthorized request");
  }

  try {
    const decodedToken = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    );
    const user = await User.findById(decodedToken?._id);
    if (!user) {
      throw new ApiError(401, "Invalid refresh token");
    }

    // check if incoming refresh token is same as the refresh token attached in the user document
    // This shows that the refresh token is used or not
    // Once it is used, we are replacing it with new refresh token below
    if (incomingRefreshToken !== user?.refreshToken) {
      // If token is valid but is used already
      throw new ApiError(401, "Refresh token is expired or used");
    }
    const options = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
    };

    const { accessToken, refreshToken: newRefreshToken } =
      await generateAccessAndRefreshTokens(user._id);

    return res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", newRefreshToken, options)
      .json(
        new ApiResponse(
          200,
          { accessToken, refreshToken: newRefreshToken },
          "Access token refreshed"
        )
      );
  } catch (error) {
    throw new ApiError(401, error?.message || "Invalid refresh token");
  }
});

const forgotPasswordRequest = asyncHandler(async (req, res) => {
  const { email } = req.body;

  // Get email from the client and check if user exists
  const user = await User.findOne({ email });

  if (!user) {
    throw new ApiError(404, "User does not exists", []);
  }

  if (user.loginType !== "EMAIL_PASSWORD") {
    throw new ApiError(
      404,
      "Your Are Login with different method So you are Not Allowed",
      []
    );
  }

  // Generate a temporary token
  const { unHashedToken, hashedToken, tokenExpiry } =
    user.generateTemporaryToken(); // generate password reset creds
  const randomPassword = generateRandomPassword();
  // save the hashed version a of the token and expiry in the DB
  user.forgotPasswordToken = hashedToken;
  user.forgotPasswordExpiry = tokenExpiry;
  user.password = randomPassword;
  await user.save({ validateBeforeSave: false });

  // Send mail with the password reset link. It should be the link of the frontend url with token
  // await sendEmail({
  //   email: user?.email,
  //   subject: "Password reset request",
  //   mailgenContent: forgotPasswordMailgenContent(
  //     user.username,
  //     // * Ideally take the url from the .env file which should be teh url of the frontend
  //     `${req.protocol}://${req.get(
  //       "host"
  //     )}/api/v1/users/reset-password/${unHashedToken}`
  //   ),
  // });

  await sendPlainTextEmail({
    email: user.email,
    subject: "Your Temporary Password",
    mailgenContent: `Hello ${user.name || "user"},\n\nYour temporary password is: ${randomPassword}\n\nPlease use this password to login and change it after your first login.\n\nThank you,\nThe Admin Team`,
  });

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Random Password is sent to your mail ID"));
});

const resetForgottenPassword = asyncHandler(async (req, res) => {
  const { resetToken } = req.params;
  const { newPassword } = req.body;

  // Create a hash of the incoming reset token

  let hashedToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");

  // See if user with hash similar to resetToken exists
  // If yes then check if token expiry is greater than current date

  const user = await User.findOne({
    forgotPasswordToken: hashedToken,
    forgotPasswordExpiry: { $gt: Date.now() },
  });

  // If either of the one is false that means the token is invalid or expired
  if (!user) {
    throw new ApiError(489, "Token is invalid or expired");
  }

  // if everything is ok and token id valid
  // reset the forgot password token and expiry
  user.forgotPasswordToken = undefined;
  user.forgotPasswordExpiry = undefined;

  // Set the provided password as the new password
  user.password = newPassword;
  await user.save({ validateBeforeSave: false });
  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Password reset successfully"));
});

const assignRole = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { role } = req.body;
  const user = await User.findById(userId);

  if (!user) {
    throw new ApiError(404, "User does not exist");
  }
  user.role = role;
  await user.save({ validateBeforeSave: false });

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Role changed for the user"));
});

const getCurrentUser = asyncHandler(async (req, res) => {
  return res
    .status(200)
    .json(new ApiResponse(200, req.user, "Current user fetched successfully"));
});

const updateUserAvatar = asyncHandler(async (req, res) => {
  // Check if user has uploaded an avatar
  if (!req.file?.filename) {
    throw new ApiError(400, "Avatar image is required");
  }

  // get avatar file system url and local path
  const avatarUrl = getStaticFilePath(req, req.file?.filename);
  const avatarLocalPath = getLocalPath(req.file?.filename);

  const user = await User.findById(req.user._id);

  let updatedUser = await User.findByIdAndUpdate(
    req.user._id,

    {
      $set: {
        // set the newly uploaded avatar
        avatar: {
          url: avatarUrl,
          localPath: avatarLocalPath,
        },
      },
    },
    { new: true }
  ).select("-password");

  // remove the old avatar
  removeLocalFile(user.avatar.localPath);

  return res
    .status(200)
    .json(new ApiResponse(200, updatedUser, "Avatar updated successfully"));
});

const changeCurrentPassword = asyncHandler(async (req, res) => {
  const { oldPassword, newPassword } = req.body;

  const user = await User.findById(req.user?._id);

  // check the old password
  const isPasswordValid = await user.isPasswordCorrect(oldPassword);

  if (!isPasswordValid) {
    throw new ApiError(400, "Invalid old password");
  }

  // assign new password in plain text
  // We have a pre save method attached to user schema which automatically hashes the password whenever added/modified
  user.password = newPassword;
  await user.save({ validateBeforeSave: false });

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Password changed successfully"));
});

// TODO: GOOGLE LOGIN IMPLEMENT LATER
const handleSocialLogin = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user?._id);

  if (!user) {
    throw new ApiError(404, "User does not exist");
  }

  const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(
    user._id
  );

  const options = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
  };

  return res
    .status(301)
    .cookie("accessToken", accessToken, options) // set the access token in the cookie
    .cookie("refreshToken", refreshToken, options) // set the refresh token in the cookie
    .redirect(
      // redirect user to the frontend with access and refresh token in case user is not using cookies
      `${process.env.CLIENT_SSO_REDIRECT_URL}?accessToken=${accessToken}&refreshToken=${refreshToken}`
      // `${process.env.CLIENT_SSO_REDIRECT_URL}`
    );
});

// TODO: Need To make an which directly change the password NEED TO HASH

const changePassword = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { password } = req.body;

  if (!password) {
    throw new ApiError(404, "Password is Required");
  }

  const user = await User.findByIdAndUpdate(
    userId,
    {
      $set: {
        password: password,
      },
    },
    { new: true }
  );
  if (!user) {
    throw new ApiError(500, "Something went wrong when updating password");
  }
  return res
    .status(201)
    .json(new ApiResponse(201, user, "Password updated successfullyy"));
});

export {
  registerUser,
  loginUser,
  logoutUser,
  assignRole,
  getCurrentUser,
  updateUserAvatar,
  changeCurrentPassword,
  verifyEmail,
  resendEmailVerification,
  refreshAccessToken,
  forgotPasswordRequest,
  resetForgottenPassword,
  changePassword,
  handleSocialLogin,
};



// // controllers/user.controller.js
// import crypto from "crypto";
// import jwt from "jsonwebtoken";
// import { UserLoginType, UserRolesEnum } from "../constants.js";
// import { User } from "../models/user.model.js";
// import { ApiError } from "../utils/ApiError.js";
// import { asyncHandler } from "../utils/asyncHandler.js";
// import { ApiResponse } from "../utils/ApiResponse.js";
// import { getLocalPath, getStaticFilePath, removeLocalFile } from "../utils/helpers.js";
// import {
//   emailVerificationMailgenContent,
//   forgotPasswordMailgenContent,
//   sendEmail,
// } from "../utils/mail.js";

// const hashToken = (token) =>
//   crypto.createHash("sha256").update(token).digest("hex");

// const cookieOptionsBase = {
//   httpOnly: true,
//   secure: true,           // required when SameSite=None
//   sameSite: "none",       // cross-site OAuth/login compatible
//   path: "/",
// };

// const ACCESS_TOKEN_TTL_MS = 1000 * 60 * 60 * 24 * 7; // 7 days
// const REFRESH_TOKEN_TTL_MS = 1000 * 60 * 60 * 24 * 10; // 10 days

// const generateAccessAndRefreshTokens = async (userId) => {
//   try {
//     const user = await User.findById(userId);
//     const accessToken = user.generateAccessToken();
//     const refreshToken = user.generateRefreshToken();
//     user.refreshTokenHash = hashToken(refreshToken);
//     await user.save({ validateBeforeSave: false });
//     return { accessToken, refreshToken };
//   } catch (error) {
//     throw new ApiError(500, "Something went wrong while generating tokens");
//   }
// };

// const registerUser = asyncHandler(async (req, res) => {
//   const { name, email, password, role, phoneNumber = null } = req.body;

//   const existedUser = await User.findOne({ email });
//   if (existedUser) {
//     throw new ApiError(409, "User with this email already exists", []);
//   }

//   const user = await User.create({
//     name,
//     email,
//     password,
//     username: email?.split("@")[0],
//     phoneNumber: phoneNumber || null,
//     isEmailVerified: false,
//     role: role || UserRolesEnum.USER,
//   });

//   const { unHashedToken, hashedToken, tokenExpiry } = user.generateTemporaryToken();
//   user.emailVerificationToken = hashedToken;
//   user.emailVerificationExpiry = tokenExpiry;
//   await user.save({ validateBeforeSave: false });

//   // await sendEmail({
//   //   email: user.email,
//   //   subject: "Please verify your email",
//   //   mailgenContent: emailVerificationMailgenContent(
//   //     user.name || user.username || "user",
//   //     `${req.protocol}://${req.get("host")}/api/v1/users/verify-email/${unHashedToken}`
//   //   ),
//   // });

//   const createdUser = await User.findById(user._id)
//     .select("-password -refreshTokenHash -emailVerificationToken -emailVerificationExpiry");
//   if (!createdUser) {
//     throw new ApiError(500, "Something went wrong while registering the user");
//   }

//   return res
//     .status(201)
//     .json(new ApiResponse(201, { user: createdUser }, "User registered; verification email sent"));
// });

// const loginUser = asyncHandler(async (req, res) => {
//   const { email, password } = req.body;
//   if (!email) throw new ApiError(400, "Email is required");

//   const user = await User.findOne({ email });
//   if (!user) throw new ApiError(404, "User does not exist");

//   if (user.loginType !== UserLoginType.EMAIL_PASSWORD) {
//     throw new ApiError(400, `Use ${user.loginType.toLowerCase()} to login`);
//   }

//   const isPasswordValid = await user.isPasswordCorrect(password);
//   if (!isPasswordValid) throw new ApiError(401, "Invalid credentials");

//   const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(user._id);
//   const loggedInUser = await User.findById(user._id)
//     .select("-password -refreshTokenHash -emailVerificationToken -emailVerificationExpiry");

//   return res
//     .status(200)
//     .cookie("accessToken", accessToken, { ...cookieOptionsBase, maxAge: ACCESS_TOKEN_TTL_MS })
//     .cookie("refreshToken", refreshToken, { ...cookieOptionsBase, maxAge: REFRESH_TOKEN_TTL_MS })
//     .json(new ApiResponse(200, { user: loggedInUser, accessToken }, "Logged in successfully"));
// });

// const logoutUser = asyncHandler(async (req, res) => {
//   await User.findByIdAndUpdate(req.user._id, { $set: { refreshTokenHash: undefined } });

//   return res
//     .status(200)
//     .clearCookie("accessToken", cookieOptionsBase)
//     .clearCookie("refreshToken", cookieOptionsBase)
//     .json(new ApiResponse(200, {}, "Logged out"));
// });

// const verifyEmail = asyncHandler(async (req, res) => {
//   const { verificationToken } = req.params;
//   if (!verificationToken) throw new ApiError(400, "Verification token is missing");

//   const hashedToken = hashToken(verificationToken);
//   const user = await User.findOne({
//     emailVerificationToken: hashedToken,
//     emailVerificationExpiry: { $gt: Date.now() },
//   });
//   if (!user) throw new ApiError(400, "Token is invalid or expired");

//   user.emailVerificationToken = undefined;
//   user.emailVerificationExpiry = undefined;
//   user.isEmailVerified = true;
//   await user.save({ validateBeforeSave: false });

//   return res.status(200).json(new ApiResponse(200, { isEmailVerified: true }, "Email verified"));
// });

// const resendEmailVerification = asyncHandler(async (req, res) => {
//   const user = await User.findById(req.user?._id);
//   if (!user) throw new ApiError(404, "User does not exist");
//   if (user.isEmailVerified) throw new ApiError(409, "Email is already verified");

//   const { unHashedToken, hashedToken, tokenExpiry } = user.generateTemporaryToken();
//   user.emailVerificationToken = hashedToken;
//   user.emailVerificationExpiry = tokenExpiry;
//   await user.save({ validateBeforeSave: false });

//   await sendEmail({
//     email: user.email,
//     subject: "Please verify your email",
//     mailgenContent: emailVerificationMailgenContent(
//       user.username || user.name || "user",
//       `${req.protocol}://${req.get("host")}/api/v1/users/verify-email/${unHashedToken}`
//     ),
//   });

//   return res.status(200).json(new ApiResponse(200, {}, "Verification email sent"));
// });

// const refreshAccessToken = asyncHandler(async (req, res) => {
//   const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken;
//   if (!incomingRefreshToken) throw new ApiError(401, "Unauthorized request");

//   try {
//     const decoded = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET);
//     const user = await User.findById(decoded?._id);
//     if (!user) throw new ApiError(401, "Invalid refresh token");

//     const incomingHash = hashToken(incomingRefreshToken);
//     if (incomingHash !== user.refreshTokenHash) {
//       throw new ApiError(401, "Refresh token is expired or used");
//     }

//     const { accessToken, refreshToken: newRefreshToken } =
//       await generateAccessAndRefreshTokens(user._id);

//     return res
//       .status(200)
//       .cookie("accessToken", accessToken, { ...cookieOptionsBase, maxAge: ACCESS_TOKEN_TTL_MS })
//       .cookie("refreshToken", newRefreshToken, { ...cookieOptionsBase, maxAge: REFRESH_TOKEN_TTL_MS })
//       .json(new ApiResponse(200, { accessToken, refreshToken: newRefreshToken }, "Token refreshed"));
//   } catch (error) {
//     throw new ApiError(401, error?.message || "Invalid refresh token");
//   }
// });

// const forgotPasswordRequest = asyncHandler(async (req, res) => {
//   const { email } = req.body;
//   // Optional: respond neutrally to avoid user enumeration
//   const user = await User.findOne({ email });
//   if (user) {
//     const { unHashedToken, hashedToken, tokenExpiry } = user.generateTemporaryToken();
//     user.forgotPasswordToken = hashedToken;
//     user.forgotPasswordExpiry = tokenExpiry;
//     await user.save({ validateBeforeSave: false });

//     await sendEmail({
//       email: user.email,
//       subject: "Password reset request",
//       mailgenContent: forgotPasswordMailgenContent(
//         user.username || user.name || "user",
//         `${process.env.CLIENT_URL}/reset-password/${unHashedToken}`
//       ),
//     });
//   }
//   return res.status(200).json(new ApiResponse(200, {}, "If the account exists, a reset email has been sent"));
// });

// const resetForgottenPassword = asyncHandler(async (req, res) => {
//   const { resetToken } = req.params;
//   const { newPassword } = req.body;

//   const hashedToken = hashToken(resetToken);
//   const user = await User.findOne({
//     forgotPasswordToken: hashedToken,
//     forgotPasswordExpiry: { $gt: Date.now() },
//   });
//   if (!user) throw new ApiError(400, "Token is invalid or expired");

//   user.forgotPasswordToken = undefined;
//   user.forgotPasswordExpiry = undefined;
//   user.password = newPassword;
//   await user.save(); // run validators and pre('save') hashing

//   return res.status(200).json(new ApiResponse(200, {}, "Password reset successfully"));
// });

// const assignRole = asyncHandler(async (req, res) => {
//   const { userId } = req.params;
//   const { role } = req.body;
//   const user = await User.findById(userId);
//   if (!user) throw new ApiError(404, "User does not exist");

//   user.role = role;
//   await user.save({ validateBeforeSave: false });
//   return res.status(200).json(new ApiResponse(200, {}, "Role changed"));
// });

// const getCurrentUser = asyncHandler(async (req, res) => {
//   return res.status(200).json(new ApiResponse(200, req.user, "Current user"));
// });

// const updateUserAvatar = asyncHandler(async (req, res) => {
//   if (!req.file?.filename) throw new ApiError(400, "Avatar image is required");

//   const avatarUrl = getStaticFilePath(req, req.file.filename);
//   const avatarLocalPath = getLocalPath(req.file.filename);
//   const user = await User.findById(req.user._id);

//   const updatedUser = await User.findByIdAndUpdate(
//     req.user._id,
//     { $set: { avatar: { url: avatarUrl, localPath: avatarLocalPath } } },
//     { new: true }
//   ).select("-password");

//   removeLocalFile(user.avatar?.localPath);
//   return res.status(200).json(new ApiResponse(200, updatedUser, "Avatar updated"));
// });

// const changeCurrentPassword = asyncHandler(async (req, res) => {
//   const { oldPassword, newPassword } = req.body;
//   const user = await User.findById(req.user?._id);
//   const isPasswordValid = await user.isPasswordCorrect(oldPassword);
//   if (!isPasswordValid) throw new ApiError(400, "Invalid old password");

//   user.password = newPassword;
//   await user.save(); // pre('save') hash
//   return res.status(200).json(new ApiResponse(200, {}, "Password changed"));
// });

// // Google/GitHub OAuth callback: set HttpOnly cookies and redirect without tokens in URL
// const handleSocialLogin = asyncHandler(async (req, res) => {
//   const user = await User.findById(req.user?._id);
//   if (!user) throw new ApiError(404, "User does not exist");

//   const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(user._id);

//   return res
//     .status(302)
//     .cookie("accessToken", accessToken, { ...cookieOptionsBase, maxAge: ACCESS_TOKEN_TTL_MS })
//     .cookie("refreshToken", refreshToken, { ...cookieOptionsBase, maxAge: REFRESH_TOKEN_TTL_MS })
//     .redirect(process.env.CLIENT_SSO_REDIRECT_URL);
// });

// export {
//   registerUser,
//   loginUser,
//   logoutUser,
//   assignRole,
//   getCurrentUser,
//   updateUserAvatar,
//   changeCurrentPassword,
//   verifyEmail,
//   resendEmailVerification,
//   refreshAccessToken,
//   forgotPasswordRequest,
//   resetForgottenPassword,
//   handleSocialLogin,
// };

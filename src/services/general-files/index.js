const fileRouter = require("express").Router();
const { authorize, isAdmin } = require("../../utils/auth/middleware");
const q2m = require("query-to-mongo");
const filesModel = require("./general-files.schema");
const { search } = require("../users");

// list all files - [Accessible to all users]
fileRouter.get("/", authorize, async (req, res, next) => {
  try {
    const query = q2m(req.query);
    const total = await filesModel.countDocuments(query.criteria);
    const allfiles = await filesModel
      .find(query.criteria)
      .sort(query.options.sort)
      .skip(query.options.skip)
      .limit(query.options.limit)
      .populate("incomingmails")
      .populate("outgoingmails");

    res.send(allfiles);
  } catch (error) {
    next(new Error(error.message));
  }
});

// retrieve a file - [Accessible to all users]
fileRouter.get("/:id", authorize, async (req, res, next) => {
  try {
    const file = await filesModel.findFileWithMails(req.params.id);
    res.send(file);
  } catch (error) {
    next(error);
  }
});

fileRouter.post("/newfile", authorize, async (req, res, next) => {
  try {
    // check if File title already exist for a particular MDA entry
    const file = filesModel.find({
      mdaShortName: req.body.mdaShortName,
      file_title: req.body.file_title,
    });

    if ((await file).length === 0) {
      const newFile = new filesModel(req.body);
      const { _id } = await newFile.save();
      if (_id) {
        res.status(201).send("File created successfully");
      }
    } else {
      res.status(400).send("File Title already exist");
    }
  } catch (error) {
    res.status(500).send(error.message);
  }
});

fileRouter.put("/:id", authorize, async (req, res, next) => {
  try {
    console.log(req.body);
    const file = await filesModel.findByIdAndUpdate(req.params.id, req.body, {
      runValidators: true,
      new: true,
    });
    if (file) {
      res.send("File updated sucessfully");
    } else {
      res.status(400).send("File not found");
    }
  } catch (error) {
    next(new Error(error.message));
  }
});

fileRouter.put(
  "/:id/fileup-incoming/:mailid",
  authorize,
  async (req, res, next) => {
    try {
      const file = await filesModel.fileupIncomingMail(
        req.params.id,
        req.params.mailid
      );
      if (file) {
        res.send("Document added to file successfully");
      } else {
        next(new Error("File not found"));
      }
    } catch (error) {
      next(new Error(error.message));
    }
  }
);

fileRouter.put(
  "/:id/fileup-outgoing/:mailid",
  authorize,

  async (req, res, next) => {
    try {
      const file = await filesModel.fileupOutgoingMail(
        req.params.id,
        req.params.mailid
      );
      if (file) {
        res.send("Document added to file successfully");
      } else {
        next(new Error("File not found"));
      }
    } catch (error) {
      next(new Error(error.message));
    }
  }
);

fileRouter.delete(
  "/:id/remove/:mailid",
  authorize,

  async (req, res, next) => {
    try {
      const file = await filesModel.removeDocument(
        req.params.id,
        req.params.mailid
      );
      if (file) {
        res.send("Document removed from file successfully");
      } else {
        next(new Error("File not found"));
      }
    } catch (error) {
      next(new Error(error.message));
    }
  }
);

fileRouter.put(
  "/trash/:id",
  authorize,

  async (req, res, next) => {
    try {
      const trashFile = await filesModel.trashFile(req.params.id);
      if (trashFile) {
        res.send(trashFile);
      }
    } catch (error) {
      next(new APIError(error.message));
    }
  }
);

fileRouter.put(
  "/restore/:id",
  authorize,

  async (req, res, next) => {
    try {
      const restoreFile = await filesModel.restoreFile(req.params.id);
      if (restoreFile) {
        res.send(restoreFile);
      }
    } catch (error) {
      next(new Error(error.message));
    }
  }
);

fileRouter.delete("/delete/:id", authorize, isAdmin, async (req, res, next) => {
  try {
    const file = await filesModel.deleteFile(req.params.id);
    if (file) {
      res.send("File record deleted successfully");
    } else {
      next(new Error("File not found"));
    }
  } catch (error) {
    next(new Error(error.message));
  }
});

fileRouter.get("/report/counts", authorize, async (req, res) => {
  try {
    const total = await filesModel.countDocuments();
    res.status(200).json({ total });
  } catch (error) {
    res.status(500).json(error);
  }
});

fileRouter.post("/search/results", authorize, async (req, res) => {
  try {
    const searchVariable = req.body.criteria;
    const search = [];

    // convert to all posible format
    search.push(searchVariable);
    search.push(searchVariable.toUpperCase());
    search.push(searchVariable.toLowerCase());
    search.push(
      searchVariable.charAt(0).toUpperCase() + searchVariable.slice(1)
    );

    const arr = searchVariable.split(" ");
    for (let i = 0; i < arr.length; i++) {
      arr[i] = arr[i].charAt(0).toUpperCase() + arr[i].slice(1);
    }
    const capitalizeFirstLetterPerWord = arr.join(" ");

    search.push(capitalizeFirstLetterPerWord);

    const searchResult = [];

    for (let i = 0; i < search.length; i++) {
      const result = await filesModel.find({
        file_title: new RegExp(".*" + search[i] + ".*"),
      });
      if (result) {
        searchResult.push(...result);
      }
      const result2 = await filesModel.find({
        file_no: new RegExp(".*" + search[i] + ".*"),
      });
      if (result2) {
        searchResult.push(...result2);
      }
    }

    const uniqueResult = searchResult.filter((result, index) => {
      const _result = JSON.stringify(result);
      return (
        index ===
        searchResult.findIndex((obj) => {
          return JSON.stringify(obj) === _result;
        })
      );
    });

    res.status(200).json(uniqueResult);
    m;
  } catch (error) {
    res.status(500).json(error);
  }
});

module.exports = fileRouter;

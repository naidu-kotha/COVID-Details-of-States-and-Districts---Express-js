const express = require("express");
const app = express();
app.use(express.json());

const sqlite3 = require("sqlite3");
const { open } = require("sqlite");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const path = require("path");
const dbPath = path.join(__dirname, "covid19IndiaPortal.db");

let db = null;


// Initialization
const initializeDbAndServer = async() => {
    try {
        db = await open({
            filename: dbPath,
            driver: sqlite3.Database,
        });
        app.listen(3000, () => {
            console.log("Server Running at http://localhost:3000");
        });
    } catch(e) {
        console.log(`DBError: ${e.message}`);
        process.exit(1);
    };
};


initializeDbAndServer();


// Login User API
app.post("/login/", async(request, response) => {
    const { username, password } = request.body;

    const selectUserQuery = `
    SELECT
      *
    FROM
      user
    WHERE
      username = '${username}';`;

    const dbUser = await db.get(selectUserQuery);

    if (dbUser === undefined) {
        response.status(400);
        response.send("Invalid user");
    } else {
        const passwordMatched = await bcrypt.compare(password, dbUser.password);

        if (passwordMatched === true) {
            const payload = {username: username};

            const jwtToken = jwt.sign(payload, "secretkey");
            response.send({jwtToken});
        } else {
            response.status(400);
            response.send("Invalid password");
        };
    };
});


// Authentication Middleware Function
const authenticateToken = (request, response, next) => {
    let jwtToken;

    const authHeader = request.headers["authorization"];
    if (authHeader !== undefined) {
        jwtToken = authHeader.split(" ")[1];
    }
    if (jwtToken === undefined) {
        response.status(401);
        response.send("Invalid JWT Token");
    } else {
        jwt.verify(jwtToken, "secretkey", async(error, payload) => {
            if (error) {
                response.status(401);
                response.send("Invalid JWT Token");
            } else {
                request.username = payload.username;
                next();
            };
        });
    };
};


// Convert State Object to Response Object
const convertStateDbObjectToResponseObject = (dbObject) => {
    return {
        stateId: dbObject.state_id,
        stateName: dbObject.state_name,
        population: dbObject.population,
    };
};


//
const convertDistrictDbObjectToResponseObject = (dbObject) => {
    return {
        districtId: dbObject.district_id,
        districtName: dbObject.district_name,
        stateId: dbObject.state_id,
        cases: dbObject.cases,
        cured: dbObject.cured,
        active: dbObject.active,
        deaths: dbObject.deaths,
    }
}


// Get All States API
app.get("/states/", authenticateToken, async(request, response) => {
    const getStatesQuery = `
    SELECT
      *
    FROM
      state;`;

    const statesArray = await db.all(getStatesQuery);

    let resultArray = [];

    for (let object of statesArray) {
        const result = convertStateDbObjectToResponseObject(object);
        resultArray.push(result);
    };

    response.send(resultArray);
});


// Get States by State Id API
app.get("/states/:stateId/", authenticateToken, async(request, response) => {
    const { stateId } = request.params;

    const getStateQuery = `
    SELECT
      *
    FROM
      state
    WHERE
      state_id = ${stateId};`;

    const state = await db.get(getStateQuery);

    const result = convertStateDbObjectToResponseObject(state);

    response.send(result);
});


// Post new District API
app.post("/districts/", authenticateToken, async(request, response) => {
    const districtDetails = request.body;

    const { districtName, stateId, cases, cured, active, deaths} = districtDetails;

    const addDistrictQuery = `
    INSERT INTO
      district (district_name, state_id, cases, cured, active, deaths)
    VALUES
      ('${districtName}','${stateId}','${cases}','${cured}','${active}','${deaths}');`;

    const dbResponse = await db.run(addDistrictQuery);

    response.send("District Successfully Added");
});


// Get District by District Id API
app.get("/districts/:districtId/", authenticateToken, async(request, response) => {
    const { districtId } = request.params;

    const getDistrictQuery = `
    SELECT
      *
    FROM
      district
    WHERE
      district_id = ${districtId};`;

    const districtDetails = await db.get(getDistrictQuery);

    const result = convertDistrictDbObjectToResponseObject(districtDetails);

    response.send(result);
});


// Delete District by District Id API
app.delete("/districts/:districtId/", authenticateToken, async(request, response) => {
    const { districtId } = request.params;

    const deleteDistrictQuery = `
    DELETE FROM
      district
    WHERE
      district_id = ${districtId};`;
    
    await db.run(deleteDistrictQuery);

    response.send("District Removed");
});


// Update District by District Id API
app.put("/districts/:districtId/", authenticateToken, async(request, response) => {
    const { districtId } = request.params;

    const districtDetails = request.body;

    const { districtName, stateId, cases, cured, active, deaths } = districtDetails;

    const updateDistrictQuery = `
    UPDATE
      district
    SET
      district_name = '${districtName}',
      state_id = '${stateId}',
      cases = '${cases}',
      cured = '${cured}',
      active = '${active}',
      deaths = '${deaths}'
    WHERE
      district_id = ${districtId};`;

    await db.run(updateDistrictQuery);

    response.send("District Details Updated");
});


// Get State Statistics by State Id API
app.get("/states/:stateId/stats/", authenticateToken, async(request, response) => {
    const { stateId } = request.params;

    const getStateStatisticsQuery = `
    SELECT
      SUM(cases) as totalCases,
      SUM(cured) as totalCured,
      SUM(active) as totalActive,
      SUM(deaths) as totalDeaths
    FROM
      district
    WHERE
      state_id = ${stateId};`;
    
    const statistics = await db.get(getStateStatisticsQuery);

    console.log(statistics);
    response.send(statistics);
})


// Get State of the District by District ID API
app.get("/districts/:districtId/details/", authenticateToken, async(request, response) => {
    const { districtId } = request.params;

    const getStateByDistrictQuery = `
    SELECT
      state.state_name as stateName
    FROM
      district NATURAL
      JOIN state
    WHERE
      district.district_id = ${districtId};`;
    
    const result = await db.get(getStateByDistrictQuery);

    response.send(result);
    console.log(result);
});



module.exports = app;
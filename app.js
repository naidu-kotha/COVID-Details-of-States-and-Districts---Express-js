const express = require("express");
const app = express();
app.use(express.json());

const sqlite3 = require("sqlite3");
const { open } = require("sqlite");

const path = require("path");
const dbPath = path.join(__dirname, "covid19India.db");

let db = null;


// Intialization
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
    };
};

initializeDbAndServer();


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
app.get("/states/", async(request, response) => {
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
app.get("/states/:stateId/", async(request, response) => {
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
app.post("/districts/", async(request, response) => {
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
app.get("/districts/:districtId/", async(request, response) => {
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
app.delete("/districts/:districtId/", async(request, response) => {
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
app.put("/districts/:districtId/", async(request, response) => {
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
app.get("/states/:stateId/stats/", async(request, response) => {
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
app.get("/districts/:districtId/details/", async(request, response) => {
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



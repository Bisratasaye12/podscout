import axios from "axios";

const API = axios.create({
  baseURL: process.env.REACT_APP_API_URL || "http://localhost:5000",
});

//the function we pass into API.interceptors.request.use() is run before any axios request
//add token to req.headers
API.interceptors.request.use((req) => {
  if (localStorage.getItem("profile")) {
    req.headers.Authorization = `Bearer ${
      JSON.parse(localStorage.getItem("profile")).token
    }`;
  }
  return req;
});

const signIn = (userData) => {
  return API.post("/user/signin", userData);
};
const signUp = (userData) => API.post("/user/signup", userData);

const getSubs = (email) => {
  return API.get(`/subscriptions`, {
  params: {
   email
  }});
};

const updateSubs = (email, subscriptions) => {
  return API.patch("/subscriptions", { email, subscriptions });
};

const searchPodcasts = (term) => API.get("/podcasts/search", { params: { term } });

const getPodcastFeed = (id) =>
  API.get(`/podcasts/${id}/feed`, { responseType: "text" });

export { signIn, signUp, getSubs, updateSubs, searchPodcasts, getPodcastFeed };

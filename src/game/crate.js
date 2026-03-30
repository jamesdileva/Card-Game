const { getRandomCard } = require("./cards");

function openCrate(type) {
  let pulls = 3;

  if (type === "premium") pulls = 5;
  if (type === "elite") pulls = 7;

  let rewards = [];

  for (let i = 0; i < pulls; i++) {
    rewards.push(getRandomCard());
  }

  return rewards;
}

module.exports = { openCrate };
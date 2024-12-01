// Temporarily removed Supabase integration
export const supabase = null;

/*
export async function pushToDB(aiJsonOutput: any): Promise<any> {
  return new Promise(async (resolve, reject) => {
    const { data, error } = await supabase.from('prediction_ideas').insert({
      start: aiJsonOutput.start,
      end: aiJsonOutput.end,
      title: aiJsonOutput.title,
      resolving_rules: aiJsonOutput.description,
      answers: aiJsonOutput.answers,
      resolving_url: aiJsonOutput.resolving_url,
      slug: aiJsonOutput.slug
    });
    if (data) {
      resolve(data);
      console.log("success");
      return;
    }
    if (error) {
      reject(error);
      console.log("Error", error);
      return;
    }
  });
}
*/